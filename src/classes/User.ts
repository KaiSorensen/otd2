import { retrievePopulatedUser, updateUser, switchFolderOfList } from '../wdb/wdbService';
import { Folder } from './Folder';
import { List } from './List';
import { TodayInfo } from './TodayInfo';

export class User {

    private _todayInfo: TodayInfo;

    private _id: string;
    private _username: string;
    private _email: string;
    private _avatarURL: string | null;
    private _notifsEnabled: boolean;
    private _selectedTodayListIndex: number;
    private _dateLastRotatedTodayLists: Date | null;

    // these are not in User table of the database, but they get populated when logged in
    private _rootFolders: Folder[];
    private _listMap: Map<string, List>;

    // Constructor to create an User instance
    constructor(
        id: string,
        username: string,
        email: string,
        avatarURL: string | null,
        notifsEnabled: boolean,
        selectedTodayListIndex: number | 0,
        dateLastRotatedTodayLists: Date | null
    ) {

        this._id = id;
        this._username = username;
        this._email = email;
        this._avatarURL = avatarURL;
        this._notifsEnabled = notifsEnabled;
        this._selectedTodayListIndex = selectedTodayListIndex;

        this._rootFolders = [];
        this._listMap = new Map<string, List>();

        this._dateLastRotatedTodayLists = dateLastRotatedTodayLists;


        this._todayInfo = new TodayInfo(this.getTodayLists());
    }

    get todayInfo(): TodayInfo { return this._todayInfo; }
    set todayInfo(value: TodayInfo) { this._todayInfo = value; }

    // Getters for read-only properties
    get id(): string { return this._id; }

    // Getters and setters for mutable properties
    get username(): string { return this._username; }
    set username(value: string) { this._username = value; }

    get email(): string { return this._email; }
    set email(value: string) { this._email = value; }

    get avatarURL(): string | null { return this._avatarURL; }
    set avatarURL(value: string | null) { this._avatarURL = value; }

    get notifsEnabled(): boolean { return this._notifsEnabled; }
    set notifsEnabled(value: boolean) { this._notifsEnabled = value; }

    get selectedTodayListIndex(): number { return this._selectedTodayListIndex; }
    set selectedTodayListIndex(value: number) { this._selectedTodayListIndex = value; }

    get dateLastRotatedTodayLists(): Date | null { return this._dateLastRotatedTodayLists; }
    set dateLastRotatedTodayLists(value: Date | null) { this._dateLastRotatedTodayLists = value; }

    get rootFolders(): Folder[] { return this._rootFolders; }
    set rootFolders(value: Folder[]) { this._rootFolders = value; }

    get listMap(): Map<string, List> { return this._listMap; }
    set listMap(value: Map<string, List>) { this._listMap = value; }


    // Method to save changes to the database
    async save(): Promise<void> {
        await updateUser(this._id, {
            username: this._username,
            email: this._email,
            avatarURL: this._avatarURL,
            notifsEnabled: this._notifsEnabled
        });
    }

    // Method to refresh data from the database
    async refresh(): Promise<void> {
        const data = await retrievePopulatedUser(this._id);

        if (data === null) {
            throw new Error('User not found');
        }

        this._username = data.username;
        this._email = data.email;
        this._avatarURL = data.avatarURL;
        this._notifsEnabled = data.notifsEnabled;

        // Refresh library data
        this._rootFolders = data.rootFolders;
        this._listMap = data.listMap;
        this._todayInfo = new TodayInfo(this.getTodayLists());

        // // console.log("refreshed user")
    }

    public addRootFolder(folder: Folder) {
        this._rootFolders.push(folder);
    }
    public removeRootFolder(folder: Folder) {
        this._rootFolders = this._rootFolders.filter(f => f.id !== folder.id);
    }

    public addList(list: List) {
        this._listMap.set(list.id, list);
        const folder = this.getFolder(list.folderID);
        if (folder) {
            folder.addList(list);
        } else {
            throw new Error('Folder not found');
        }
    }
    public removeList(list: List) {
        this._listMap.delete(list.id);
        const folder = this.getFolder(list.folderID);
        if (folder) {
            folder.removeList(list);
        } else {
            throw new Error('Folder not found');
        }
    }

    public addFolder(folder: Folder) {
        if (folder.parentFolderID === null) {
            this._rootFolders.push(folder);
        } else {
            const parentFolder = this.getFolder(folder.parentFolderID);
            if (parentFolder) {
                parentFolder.subFolders.push(folder);
            } else {
                throw new Error('Parent folder not found');
            }
        }
    }

    public removeFolder(folder: Folder) {
        if (folder.parentFolderID === null) {
            this._rootFolders = this._rootFolders.filter(f => f.id !== folder.id);
        } else {
            const parentFolder = this.getFolder(folder.parentFolderID);
            if (parentFolder) {
                parentFolder.subFolders = parentFolder.subFolders.filter(f => f.id !== folder.id);
            } else {
                throw new Error('Parent folder not found');
            }
        }
    }

    public getFolder(folderId: string) {
        const folders = this.getAllFolders();
        return folders.find(f => f.id === folderId);
    }

    public getList(listId: string) {
        return this._listMap.get(listId);
    }

    public getAllFolders() {
        const folders = [...this._rootFolders];
        for (const folder of folders) {
            folders.push(...folder.subFolders);
        }
        return folders;
    }

    public getTodayLists() {
        const seen = new Set<string>();
        return Array.from(this._listMap.values())
          .filter(l => l.today && !seen.has(l.id) && seen.add(l.id));
    }

    public getNotificationLists() {
        return Array.from(this._listMap.values())
            .filter(l => l.notifyOnNew || l.notifyTime);
    }

    public getCurrentItemLists() {
        // if it's in today OR it has notifications on
        return Array.from(this._listMap.values())
            .filter(l => l.today || l.notifyOnNew || l.notifyTime);
    }

    public getPublicLists() {
        return Array.from(this._listMap.values()).filter(l => l.isPublic);
    }

    public refreshTodayLists() {
        this._todayInfo.updateTodayLists(this.getTodayLists());
    }

    public async switchFolderOfList(userID: string, list: List, newFolderId: string) {
        // // console.log("[switchFolderOfList] switching folder of list", list.id, "to", newFolderId);

        const foundList = this.getList(list.id);
        if (!foundList) {
            throw new Error('ListID not found in global user object');
        }
        // Remove list from current folder
        const currentFolder = this.getFolder(list.folderID);
        const newFolder = this.getFolder(newFolderId);

        if (currentFolder && newFolder) {
            // First update the runtime objects
            list.folderID = newFolderId;
            currentFolder.removeList(list);
            newFolder.addList(list);
            // Now update the database
            await switchFolderOfList(userID, currentFolder.id, newFolder.id, list.id);
        } else {
            throw new Error('Folder not found');
        }     
    }
}

