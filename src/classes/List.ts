import { retrieveList, updateList, retrieveItem, updateLibraryList, rotateTodayItemForList, initializeTodayItem } from '../wdb/wdbService';
import { Item } from './Item';

export type SortOrder = "date-first" | "date-last" | "alphabetical" | "manual";
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export class List {
    private _id: string;
    private _ownerID: string;
    private _title: string;
    private _description: string | null;
    private _coverImageURL: string | null;
    private _isPublic: boolean;
    
    // LibraryList specific properties
    private _folderID: string;      // The folder this list is in for the current user
    private _sortOrder: SortOrder;
    private _today: boolean;
    private _currentItem: string | null;
    private _notifyOnNew: boolean;
    private _notifyTime: Date | null;
    private _notifyDays: DayOfWeek[] | null;
    private _orderIndex: number;


    // Constructor to create a List instance
    constructor(
        id: string,
        ownerID: string,
        title: string,
        description: string | null,
        coverImageURL: string | null,
        isPublic: boolean,
        folderID: string,
        sortOrder: SortOrder = "date-first",
        today: boolean = false,
        currentItem: string | null = null,
        notifyOnNew: boolean = false,
        notifyTime: Date | null = null,
        notifyDays: DayOfWeek[] | null = null,
        orderIndex: number = 0
    ) {
        this._id = id;
        this._ownerID = ownerID;
        this._title = title;
        this._description = description;
        this._coverImageURL = coverImageURL;
        this._isPublic = isPublic;
        
        // LibraryList specific properties
        this._folderID = folderID;
        this._sortOrder = sortOrder;
        this._today = today;
        this._currentItem = currentItem;
        this._notifyOnNew = notifyOnNew;
        this._notifyTime = notifyTime;
        this._notifyDays = notifyDays;
        this._orderIndex = orderIndex;

        this.ensureCurrentItem();
    }

    // Getters for read-only properties
    get id(): string { return this._id; }
    get ownerID(): string { return this._ownerID; }
    get folderID(): string { return this._folderID; }
    set folderID(value: string) { this._folderID = value; }
    get orderIndex(): number { return this._orderIndex; }
    set orderIndex(value: number) { this._orderIndex = value; }

    // Getters and setters for mutable properties
    get title(): string { return this._title; }
    set title(value: string) { this._title = value; }

    get description(): string | null { return this._description; }
    set description(value: string | null) { this._description = value; }

    get coverImageURL(): string | null { return this._coverImageURL; }
    set coverImageURL(value: string | null) { this._coverImageURL = value; }

    get isPublic(): boolean { return this._isPublic; }
    set isPublic(value: boolean) { this._isPublic = value; }

    get sortOrder(): SortOrder { return this._sortOrder; }
    set sortOrder(value: SortOrder) { this._sortOrder = value; }

    get today(): boolean { return this._today; }
    set today(value: boolean) { this._today = value; }
    
    get currentItem(): string | null { return this._currentItem; }
    set currentItem(value: string | null) { this._currentItem = value; }

    get notifyOnNew(): boolean { return this._notifyOnNew; }
    set notifyOnNew(value: boolean) { this._notifyOnNew = value; }

    get notifyTime(): Date | null { return this._notifyTime; }
    set notifyTime(value: Date | null) { this._notifyTime = value; }

    get notifyDays(): DayOfWeek[] | null { return this._notifyDays; }
    set notifyDays(value: DayOfWeek[] | null) { this._notifyDays = value; }

    async ensureCurrentItem(): Promise<void> {
        if (!this._currentItem) {
            await initializeTodayItem(this);
        }
    }

    async rotateTodayItem(userID: string, direction: "next" | "prev"): Promise<void> {
        await rotateTodayItemForList(userID, this, direction);
    }

    async getTodayItem(): Promise<Item | null> {
        if (!this._currentItem) {
            return null;
        }
        return await retrieveItem(this._currentItem);
    }

    // Check if the current user is the owner of the list
    isOwner(currentUserID: string): boolean {
        return this._ownerID === currentUserID;
    }

    // Method to save changes to the database
    async save(userID: string): Promise<void> {
        // If the current user is the owner, they can update the list metadata
        if (this.isOwner(userID)) {
            await updateList(this._id, {
                title: this._title,
                description: this._description,
                coverImageURL: this._coverImageURL,
                isPublic: this._isPublic
            });
        }
        
        // If the list is in the user's library, update the library configuration
        if (this._ownerID && this._folderID) {
            await updateLibraryList(userID, this._folderID, this._id, {
                sortOrder: this._sortOrder,
                today: this._today,
                currentItem: this._currentItem,
                notifyOnNew: this._notifyOnNew,
                notifyTime: this._notifyTime,
                notifyDays: this._notifyDays,
                orderIndex: this._orderIndex
            });
        }
    }

    // Method to refresh data from the database
    async refresh(): Promise<void> {
        // Retrieve the list with its library configuration if available
        const data = await retrieveList(this._id);

        if (!data) {
            throw new Error('List not found');
        }
        
        // Update list properties
        this._title = data.title;
        this._description = data.description;
        this._coverImageURL = data.coverImageURL;
        this._isPublic = data.isPublic;
        
        // Update library configuration if available
        if (data.folderID) {
            this._folderID = data.folderID;
            this._sortOrder = data.sortOrder;
            this._today = data.today;
            this._currentItem = data.currentItem;
            this._notifyOnNew = data.notifyOnNew;
            this._notifyTime = data.notifyTime ? new Date(data.notifyTime) : null;
            this._notifyDays = data.notifyDays;
            this._orderIndex = data.orderIndex;
        }
    }
}