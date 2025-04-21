import { testDatabase, resetDatabase } from './setup'
import { User } from '../models'
import type { Database } from '@nozbe/watermelondb'
import type { IUser } from '../models/types'

describe('User Model', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('can create a user', async () => {
    const user = await testDatabase.write(async (db: Database) => {
      return testDatabase.get('users').create((user: IUser) => {
        user.username = 'testuser'
        user.email = 'test@example.com'
        user.avatarURL = 'https://example.com/avatar.jpg'
        user.notifsEnabled = true
      })
    })

    expect(user.username).toBe('testuser')
    expect(user.email).toBe('test@example.com')
    expect(user.avatarURL).toBe('https://example.com/avatar.jpg')
    expect(user.notifsEnabled).toBe(true)
  })

  it('can create folders for a user', async () => {
    const user = await testDatabase.write(async (db: Database) => {
      return testDatabase.get('users').create((user: IUser) => {
        user.username = 'testuser'
        user.email = 'test@example.com'
      })
    })

    const folder = await testDatabase.write(async (db: Database) => {
      return testDatabase.get('folders').create((folder) => {
        folder.owner.set(user)
        folder.name = 'Test Folder'
      })
    })

    expect(folder.name).toBe('Test Folder')
    expect(folder.owner.id).toBe(user.id)
  })

  it('can query root folders', async () => {
    const user = await testDatabase.write(async (db: Database) => {
      return testDatabase.get('users').create((user: IUser) => {
        user.username = 'testuser'
        user.email = 'test@example.com'
      })
    })

    // Create a root folder
    await testDatabase.write(async (db: Database) => {
      return testDatabase.get('folders').create((folder) => {
        folder.owner.set(user)
        folder.name = 'Root Folder'
      })
    })

    // Create a child folder
    await testDatabase.write(async (db: Database) => {
      const rootFolder = await testDatabase.get('folders').find((f) => f.name === 'Root Folder')
      return testDatabase.get('folders').create((folder) => {
        folder.owner.set(user)
        folder.parentFolder.set(rootFolder)
        folder.name = 'Child Folder'
      })
    })

    const rootFolders = await user.rootFolders.fetch()
    expect(rootFolders.length).toBe(1)
    expect(rootFolders[0].name).toBe('Root Folder')
  })

  it('can query public lists', async () => {
    const user = await testDatabase.write(async (db: Database) => {
      return testDatabase.get('users').create((user: IUser) => {
        user.username = 'testuser'
        user.email = 'test@example.com'
      })
    })

    // Create a public list
    await testDatabase.write(async (db: Database) => {
      return testDatabase.get('lists').create((list) => {
        list.owner.set(user)
        list.title = 'Public List'
        list.isPublic = true
      })
    })

    // Create a private list
    await testDatabase.write(async (db: Database) => {
      return testDatabase.get('lists').create((list) => {
        list.owner.set(user)
        list.title = 'Private List'
        list.isPublic = false
      })
    })

    const publicLists = await user.publicLists.fetch()
    expect(publicLists.length).toBe(1)
    expect(publicLists[0].title).toBe('Public List')
  })
}) 