import { retrieveList, updateList, updateLibraryListConfig } from '../wdb/wdbService';

type SortOrder = "date-first" | "date-last" | "alphabetical" | "manual";
type NotifyDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export class List {
    private _id: string;
    private _ownerID: string;
    private _title: string;
    private _description: string | null;
    private _coverImageURL: string | null;
    private _isPublic: boolean;
    
    // LibraryList specific properties
    private _currentUserID: string | null; // The ID of the user who added this list to their library
    private _folderID: string;      // The folder this list is in for the current user
    private _sortOrder: SortOrder;
    private _today: boolean;
    private _currentItem: string | null;
    private _notifyOnNew: boolean;
    private _notifyTime: Date | null;
    private _notifyDays: NotifyDay | null;
    private _orderIndex: number;

    // Constructor to create a List instance
    constructor(
        id: string,
        ownerID: string,
        title: string,
        description: string | null,
        coverImageURL: string | null,
        isPublic: boolean,
        currentUserID: string | null = null,
        folderID: string,
        sortOrder: SortOrder = "date-first",
        today: boolean = false,
        currentItem: string | null = null,
        notifyOnNew: boolean = false,
        notifyTime: Date | null = null,
        notifyDays: NotifyDay | null = null,
        orderIndex: number = 0
    ) {
        this._id = id;
        this._ownerID = ownerID;
        this._title = title;
        this._description = description;
        this._coverImageURL = coverImageURL;
        this._isPublic = isPublic;
        
        // LibraryList specific properties
        this._currentUserID = currentUserID;
        this._folderID = folderID;
        this._sortOrder = sortOrder;
        this._today = today;
        this._currentItem = currentItem;
        this._notifyOnNew = notifyOnNew;
        this._notifyTime = notifyTime;
        this._notifyDays = notifyDays;
        this._orderIndex = orderIndex;
    }

    // Getters for read-only properties
    get id(): string { return this._id; }
    get ownerID(): string { return this._ownerID; }
    get currentUserID(): string | null { return this._currentUserID; }
    get folderID(): string { return this._folderID; }
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

    get notifyDays(): NotifyDay | null { return this._notifyDays; }
    set notifyDays(value: NotifyDay | null) { this._notifyDays = value; }

    // Check if the current user is the owner of the list
    isOwner(): boolean {
        return this._currentUserID !== null && this._currentUserID === this._ownerID;
    }

    // Method to save changes to the database
    async save(): Promise<void> {
        // If the current user is the owner, they can update the list metadata
        if (this.isOwner()) {
            await updateList(this._id, {
                title: this._title,
                description: this._description,
                coverImageURL: this._coverImageURL,
                isPublic: this._isPublic
            });
        }
        
        // If the list is in the user's library, update the library configuration
        if (this._currentUserID && this._folderID) {
            await updateLibraryListConfig(this._currentUserID, this._folderID, this._id, {
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
        const data = await retrieveList(this._currentUserID || this._ownerID, this._id);

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