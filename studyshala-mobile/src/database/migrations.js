import getDB from './db';

export const runMigrations = async () => {
  const db = await getDB();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS materials (
      materialId TEXT PRIMARY KEY,
      subject TEXT,
      facultyName TEXT,
      department TEXT,
      semester TEXT,
      accessCode TEXT,
      version INTEGER DEFAULT 1,
      savedOffline INTEGER DEFAULT 0,
      downloaded INTEGER DEFAULT 0,
      lastOpened TEXT,
      folderPath TEXT,
      totalSize INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      fileId TEXT PRIMARY KEY,
      materialId TEXT,
      name TEXT,
      mimeType TEXT,
      localPath TEXT,
      driveFileId TEXT,
      size INTEGER DEFAULT 0,
      downloaded INTEGER DEFAULT 0,
      lastOpened TEXT,
      updatedAt TEXT,
      FOREIGN KEY (materialId) REFERENCES materials(materialId)
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      sessionId TEXT PRIMARY KEY,
      fileId TEXT,
      materialId TEXT,
      startTime TEXT,
      endTime TEXT,
      totalMinutes INTEGER DEFAULT 0,
      lastPage INTEGER DEFAULT 0,
      totalPages INTEGER DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS search_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fileId TEXT,
      materialId TEXT,
      subject TEXT,
      facultyName TEXT,
      fileName TEXT,
      textContent TEXT
    );

    CREATE TABLE IF NOT EXISTS preload_patterns (
      fileId TEXT PRIMARY KEY,
      materialId TEXT,
      openCount INTEGER DEFAULT 0,
      lastOpenedDay TEXT,
      lastOpenedHour INTEGER,
      dayPattern TEXT,
      preloadEnabled INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS download_queue (
      queueId TEXT PRIMARY KEY,
      fileId TEXT,
      materialId TEXT,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      retryCount INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);
};
