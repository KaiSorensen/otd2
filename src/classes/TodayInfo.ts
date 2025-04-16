import { Item } from "./Item";
import { List } from "./List";
import { retrieveItem } from '../wdb/wdbService';

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
    public refreshTodayItems() {
        console.log(`Refreshing today items for ${this.todayLists.length} lists`);
        for (const list of this.todayLists) {
            if (list.currentItem) {
                console.log(`Getting item for list ${list.id}`);
                retrieveItem(list.currentItem).then(item => {
                    this.todayItems.set(list.id, item);
                }).catch(error => {
                    console.error(`Failed to retrieve item for list ${list.id}:`, error);
                    this.todayItems.set(list.id, null);
                });
            }
        }
    }
    public updateTodayLists(lists: List[]) {
        this.todayLists = lists;
        this.refreshTodayItems();
    }

    // for quick change to UI
    public changeTodayItemForList(listID: string, item: Item | null) {
        this.todayItems.set(listID, item);
    }

    getItemForList(listID: string): Item | null {
        console.log(`Getting item for list ${listID}`);
        const item = this.todayItems.get(listID);
        console.log(`Item for list ${listID}:`, item?.title);
        return item || null;
    }
}