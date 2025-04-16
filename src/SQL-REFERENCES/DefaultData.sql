DO $$
DECLARE
    user_id UUID;
    wisdom_folder_id UUID;
    notes_folder_id UUID;
    quotes_list_id UUID;
    poems_list_id UUID;
    insights_list_id UUID;
BEGIN
    -- Insert the user with a specific UUID
    user_id := '7dc7a90c-1385-4e53-bb1f-e7c8dcc7015d';
    
    INSERT INTO Users (id, username, email, avatarURL, notifsEnabled)
    VALUES (
      user_id,
      'Of The Day',
      'oftheday@otd.com',
      NULL,
      FALSE
    );
    
    -- Create the Wisdom folder
    INSERT INTO Folders (ownerID, parentFolderID, name)
    VALUES (
      user_id,
      NULL,
      'Wisdom'
    )
    RETURNING id INTO wisdom_folder_id;
    
    -- Create the Notes folder
    INSERT INTO Folders (ownerID, parentFolderID, name)
    VALUES (
      user_id,
      NULL,
      'Notes'
    )
    RETURNING id INTO notes_folder_id;
    
    -- Create the Quotes list (removed ownerOrder)
    INSERT INTO Lists (
      ownerID, 
      title, 
      description, 
      coverImageURL, 
      isPublic
    )
    VALUES (
      user_id,
      'Quotes',
      'Inspirational quotes to brighten your day',
      NULL,
      TRUE
    )
    RETURNING id INTO quotes_list_id;
    
    -- Associate Quotes list with Wisdom folder via LibraryLists (added sortOrder)
    INSERT INTO LibraryLists (ownerID, folderID, listID, orderIndex, sortOrder)
    VALUES (
      user_id,
      wisdom_folder_id,
      quotes_list_id,
      0,
      'date-first'
    );
    
    -- Create the Poems list
    INSERT INTO Lists (
      ownerID, 
      title, 
      description, 
      coverImageURL, 
      isPublic
    )
    VALUES (
      user_id,
      'Poems',
      'A collection of beautiful poems',
      NULL,
      TRUE
    )
    RETURNING id INTO poems_list_id;
    
    -- Create the Insights list
    INSERT INTO Lists (
      ownerID, 
      title, 
      description, 
      coverImageURL, 
      isPublic
    )
    VALUES (
      user_id,
      'Insights',
      'Personal insights and reflections',
      NULL,
      TRUE
    )
    RETURNING id INTO insights_list_id;
    
    -- Associate Poems and Insights lists with Notes folder via LibraryLists (added sortOrder)
    INSERT INTO LibraryLists (ownerID, folderID, listID, orderIndex, sortOrder)
    VALUES (
      user_id,
      notes_folder_id,
      poems_list_id,
      0,
      'date-first'
    );
    
    INSERT INTO LibraryLists (ownerID, folderID, listID, orderIndex, sortOrder)
    VALUES (
      user_id,
      notes_folder_id,
      insights_list_id,
      1,
      'date-first'
    );
    
    -- Add items to Quotes list
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Jordan Peterson',
      'There are cathedrals everywhere for those with the eyes to see.',
      0
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Carl Sagan',
      'We are like butterflies who flutter for a day and think it is forever.',
      1
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Man''s Search for Meaning',
      'No man should judge unless he asks himself an absolute honesty whether, in a similar situation, he might not have done the same.',
      2
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Fyodor Dostoevsky',
      'There is only one thing that I dread: not to be worthy of my sufferings.',
      3
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Spinoza''s Ethics',
      'Emotion, which is suffering, ceases to be suffering as soon as we form a clear and precise picture of it.',
      4
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Richard Feynman',
      'Study hard what interests you the most in the most undisciplined, irreverent, and original manner.',
      5
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Dumbledore',
      'Words are, in my not-so-humble opinion, our most inexhaustible source of magic. Capable of both inflicting injury and remedying it.',
      6
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Dune',
      'Deep in the human unconscious is a pervasive need for a logical universe that makes sense. But the real universe is always one step beyond logic.',
      7
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Miyamoto Musashi',
      'If you know the way broadly, you will see it in everything.',
      8
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Albert Einstein',
      'God doesn''t play dice with the universe.',
      9
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Neils Bohr',
      'Einstein, stop telling God what to do.',
      10
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Friedrich Nietzsche',
      'The line between good and evil runs through the heart of every man.',
      11
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Dune: Messiah',
      'The convoluted wording of legalisms grew up around the necessity to hide from ourselves the violence we intend toward each other. Between depriving a man of one hour from his life and depriving him of his life there exists only a difference of degree. You have done violence to him, consumed his energy. Elaborate euphemisms may conceal your intent to kill, but behind any use of power over another the ultimate assumption remains: ''I feed on your energy.''',
      12
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Waymond Wang (Everything Everywhere All At Once)',
      'Even though you broke my heart yet again, in another life I would''ve really liked just doing laundry and taxes with you. I''m not kind because I''m naive; I''m kind because it''s strategic and necessary.',
      13
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'William Shakespeare',
      'A rose by any other name would smell as sweet.',
      14
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Friedrich Nietzsche',
      'If you gaze long enough into the abyss, the abyss gazes back into you.',
      15
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Jordan Peterson',
      'You have very little right to break rules, until you have mastered them.',
      16
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      quotes_list_id,
      'Proverbs 3:5-6',
      'In all your ways acknowledge him, and he will make straight your paths.',
      17
    );
    
    -- Add items to Poems list
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      poems_list_id,
      NULL,
      'I would give anything for your friendship
You have no idea
I would take a bullet just to let you live
You''re worth it
The countless drinks and times we had
They''ll lift me up to Heaven
And when I''m gone I''ll bless you all the way
Your guardian all the way
All the way until our next lives
All the way
You brought me more than could fit into one life
Memories I wish I could sink into forever
You marks on my soul age like leather
I''ll love you forever',
      0
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      poems_list_id,
      NULL,
      'I can''t even complain
Just look what you''ve become
It''s too bad it ain''t with me
I''ll drop the roses by your feet
Why would I pay for your ring
When I could go to jail for free
And at the rate neighbors hate
I think that''s where I''m bound to be
I''ll make you believe that you''re blessed
While I relieve all your stress
Cause ain''t a damned thing different
About me when you''re present
Like a gift like a beverage
That we share in the basement
Exchanging funny faces
How the fuck did we make
Well I can''t count all the smiles
And I can''t count the laughs
But I hope you remember all the times we had
I know I will',
      1
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      poems_list_id,
      NULL,
      'I was a rock climber
Down in Utah where I thrive
Orange canyons run for miles
Like a scene from the wild west 
I''ll take the old mountain road',
      2
    );
    
    -- Add items to Insights list
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Tune into the absurd.',
      0
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Curiosity is the first victim of overstimulation.',
      1
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Worry not about the language of your visions, but rather the connection of your visions to present sensations.',
      2
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'All I do is sit and dream about who I could be.',
      3
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Your love is given in the shape of your personality.',
      4
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'From your stay in the wilderness, you take something with you in your heart that guides you thereafter.',
      5
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Woven into the fabric of beauty is the nature of truth.',
      6
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'We live in such a beautiful world: physically, but also in the minds we inhabit. The depth of your eyes runs as deep as the ocean.',
      7
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'I''m my own mystery.',
      8
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Be present, accept your burden, and give energy.',
      9
    );
    
    INSERT INTO Items (listID, title, content, orderIndex)
    VALUES (
      insights_list_id,
      NULL,
      'Be alive, accept the blues, pay forward the blessings from men before you.',
      10
    );
END $$;