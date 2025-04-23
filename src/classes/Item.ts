import { retrieveItem, updateItem } from '../wdb/wdbService';

export class Item {
    private _id: string;
    private _listID: string;
    private _title: string | null;
    private _content: string; // This will store HTML content for rich text
    private _imageURLs: string[] | null;
    private _orderIndex: number;

    // it's relevant to get the timestamps for items since it can be used to sort the items in UI
    private _createdAt: Date;
    private _updatedAt: Date;

    // Constructor to create an Item instance
    constructor(
        id: string,
        listID: string,
        title: string | null,
        content: string,
        imageURLs: string[] | null,
        orderIndex: number,
        createdAt: Date,
        updatedAt: Date
    ) {
        this._id = id;
        this._listID = listID;
        this._title = title;
        this._content = content || ''; // Ensure content is never null
        this._imageURLs = imageURLs;
        this._orderIndex = orderIndex;

        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    // Factory method to create an Item instance from database data
    static async fromId(id: string): Promise<Item> {
        const data = await retrieveItem(id);
        return Item.fromRaw(data);
    }

    // Factory method to create an Item instance from raw data
    static fromRaw(data: any): Item {
        return new Item(
            data.id,
            data.listID,
            data.title,
            data.content || '', // Ensure content is never null
            data.imageURLs,
            data.orderIndex,
            data.createdAt,
            data.updatedAt
        );
    }

    // Getters for read-only properties
    get id(): string { return this._id; }
    get listID(): string { return this._listID; }

    // Getters and setters for mutable properties
    get title(): string | null { return this._title; }
    set title(value: string | null) { this._title = value; }

    // Content can now be HTML for rich text
    get content(): string { return this._content || ''; } // Ensure content is never null
    set content(value: string) { this._content = value || ''; } // Ensure content is never null

    get imageURLs(): string[] | null { return this._imageURLs; }
    set imageURLs(value: string[] | null) { this._imageURLs = value; }

    get orderIndex(): number { return this._orderIndex; }
    set orderIndex(value: number) { this._orderIndex = value; }

    get createdAt(): Date { return this._createdAt; }
    get updatedAt(): Date { return this._updatedAt; } 
    set updatedAt(value: Date) { this._updatedAt = value; }

    // Method to save changes to the database
    async save(): Promise<void> {
        console.log('Saving item:', this._id, this._title);
        console.log('Content length:', this._content?.length || 0);
        console.log('Content preview:', this._content?.substring(0, 100));
        
        await updateItem(this._id, {
            title: this._title,
            content: this._content || '', // Ensure content is never null
            imageURLs: this._imageURLs,
            orderIndex: this._orderIndex,
        });
    }

    // Method to refresh data from the database
    async refresh(): Promise<void> {
        const data = await retrieveItem(this._id);
        if (data) {
            this._title = data.title;
            this._content = data.content || ''; // Ensure content is never null
            this._imageURLs = data.imageURLs;
            this._orderIndex = data.orderIndex;
            this._createdAt = data.createdAt;
            this._updatedAt = data.updatedAt;
        }
    }
}