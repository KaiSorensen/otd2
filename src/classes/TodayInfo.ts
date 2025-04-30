import { Item } from "./Item";
import { List } from "./List";
import { retrieveItem, rotateTodayItemForList } from '../wdb/wdbService';

export class TodayInfo {

    private _todayLists: List[];
    private _todayItems: Map<string, Item | null>;

    constructor(
        todayLists: List[],
    ) {
        console.log(`TodayInfo constructor called with ${todayLists.length} lists`);
        this._todayLists = todayLists;
        this._todayItems = new Map<string, Item | null>();

        this.refreshTodayItems();
    }

    get todayLists(): List[] { return this._todayLists; }
    set todayLists(value: List[]) { this._todayLists = value; }

    get todayItems(): Map<string, Item | null> { return this._todayItems; }
    set todayItems(value: Map<string, Item | null>) { this._todayItems = value; }
    

    //database functions
    public async refreshTodayItems() {
        console.log(`Refreshing today items for ${this.todayLists.length} lists`);
        const promises = this.todayLists.map(async (list) => {
            if (list.currentItem) {
                try {
                    const item = await retrieveItem(list.currentItem);
                    this.todayItems.set(list.id, item);
                } catch (error) {
                    console.error(`Failed to retrieve item for list ${list.id}:`, error);
                    this.todayItems.set(list.id, null);
                }
            } else {
                this.todayItems.set(list.id, null);
            }
        });
        await Promise.all(promises);
    }

    public async updateTodayLists(lists: List[]) {
        // if two lists have the same id, the last one will overwrite the first one, and we will log this.
       
        // remove duplicates from lists, log that we found duplicates
        const duplicates = lists.filter((list, index, self) =>
            index !== self.findIndex((t) => t.id === list.id)
        );
        if (duplicates.length > 0) {
            console.error(`Found ${duplicates.length} duplicates in updateTodayLists`);
        }

        this.todayLists = lists;
        await this.refreshTodayItems();
    }

    public getItemForList(listID: string): Item | null {
        const item = this.todayItems.get(listID);
        console.log(`Item for list ${listID}:`, item?.title);
        return item || null;
    }

    
}