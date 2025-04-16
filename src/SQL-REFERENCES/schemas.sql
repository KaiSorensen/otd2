-- SCHEMA FOR SUPABASE

DROP TABLE IF EXISTS LibraryLists;

DROP TABLE IF EXISTS Items;

DROP TABLE IF EXISTS Lists;

DROP TABLE IF EXISTS Folders;

DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatarURL VARCHAR(255),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notifsEnabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE Folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ownerID UUID NOT NULL,
  parentFolderID UUID, -- NULL for root folders
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerID) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (parentFolderID) REFERENCES Folders(id) ON DELETE CASCADE
);

CREATE TABLE Lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ownerID UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  coverImageURL VARCHAR(255),
  isPublic BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerID) REFERENCES Users(id) ON DELETE CASCADE
);

-- folder_lists is a many-to-many relationship between folders and lists
CREATE TABLE LibraryLists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ownerID UUID NOT NULL,
  folderID UUID NOT NULL,
  listID UUID NOT NULL,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Personal Configurations
  sortOrder VARCHAR(15) NOT NULL CHECK (
    sortOrder IN (
      'date-first',
      'date-last',
      'alphabetical',
      'manual'
    )
  ),
  today BOOLEAN NOT NULL DEFAULT FALSE,
  currentItem UUID,
  notifyOnNew BOOLEAN NOT NULL DEFAULT FALSE,
  notifyTime TIMESTAMP,
  notifyDays VARCHAR(3) CHECK (
    notifyDays IN (
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun'
    )
  ),
  -- why unique? because a list can only be in one folder at a time
  UNIQUE(folderID, listID),
  FOREIGN KEY (ownerID) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (folderID) REFERENCES Folders(id) ON DELETE CASCADE,
  FOREIGN KEY (listID) REFERENCES Lists(id) ON DELETE CASCADE
);

CREATE TABLE Items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listID UUID NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  imageURLs TEXT [],
  -- PostgreSQL array; alternatively, store image URLs in a separate table
  -- orderIndex INTEGER,
  -- the "manual" order of the item in the list
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listID) REFERENCES Lists(id) ON DELETE CASCADE
);