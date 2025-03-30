const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

// Replace with your actual credentials file path
const CREDENTIALS_PATH = '../credentials.json';
// Replace with the path to your spreadsheet file
// const SPREADSHEET_PATH = path.join(__dirname, 'spreadsheet.xlsx'); // Or .csv, etc.
const FOLDER_NAME = 'acmg_wicket_mdp_migration_files';

export const googleDriveUpload = async (filePath, timestampString) => {

    try {
        // Load client secrets from a local file.
        const credentials = require(CREDENTIALS_PATH);

        // Authorize a client with credentials.
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'], // Full Drive access
        });

        const client = await auth.getClient();

        const drive = google.drive({ version: 'v3', auth: client });

        // 1. Find the 'migration_files' folder.  Create it if it doesn't exist.
        let folderId = await findOrCreateFolder(drive, FOLDER_NAME);
        if (!folderId) {
            console.error(`Error: Could not find or create folder '${FOLDER_NAME}'.`);
            return;
        }
        console.log(`Using folder ID: ${folderId}`);

        // Share the folder
        const userEmailToShareWith = []; // Replace with the user's email
        if(userEmailToShareWith.length > 0){
            await shareFolder(drive, folderId, userEmailToShareWith);
        }

        // 2. Upload the spreadsheet.
        const fileMetadata = {
            name: `${timestampString}_${path.basename(filePath)}`,
            parents: [folderId], // Set the parent folder
        };
        const media = {
            mimeType: getMimeType(filePath), // Important: Set the correct MIME type
            body: fs.createReadStream(filePath),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id', // Only request the file ID in the response
        });

        console.log(`File uploaded with ID: ${file.data.id}`);
        return file.data.id;

    } catch (err) {
        console.error('The API encountered an error:', err);
        throw err; // Re-throw the error for handling elsewhere if needed.
    }
}

async function findOrCreateFolder(drive, folderName) {
    try {
        const res = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
            spaces: 'drive',
            fields: 'nextPageToken, files(id, name)',
        });

        const files = res.data.files;
        if (files.length > 0) {
            console.log(`Folder '${folderName}' found.`);
            return files[0].id;
        } else {
            console.log(`Folder '${folderName}' not found. Creating...`);

            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            };
            const folder = await drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            console.log(`Folder '${folderName}' created with ID: ${folder.data.id}`);
            return folder.data.id;
        }
    } catch (error) {
        console.error("Error finding or creating folder:", error);
        return null; // Indicate failure
    }
}


function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.xls':
            return 'application/vnd.ms-excel';
        case '.csv':
            return 'text/csv';
        case '.txt':
            return 'text/plain';
        case '.json':
            return 'application/json';
        default:
            return 'application/octet-stream'; // Default: generic binary file
    }
}

async function shareFolder(drive, folderId, userEmails) {  // userEmails is now an array
    if (!Array.isArray(userEmails)) {
      throw new Error("userEmails must be an array of email addresses.");
    }
  
    try {
      for (const userEmail of userEmails) {  // Iterate through the array
        await drive.permissions.create({
          fileId: folderId,
          requestBody: {
            role: 'writer', // Or 'writer'
            type: 'user',
            emailAddress: userEmail,
          },
        });
        console.log(`Folder shared with ${userEmail}`);
      }
    } catch (error) {
      console.error("Error sharing folder:", error);
      // You might want to handle errors differently here, e.g., log each individual error
      // or stop the sharing process if a critical error occurs.
      throw error; // Re-throw the error to be handled by the caller.
    }
  }

// uploadSpreadsheet().then(fileId => {
//     if (fileId) {
//         console.log("Spreadsheet upload complete. File ID:", fileId)
//     }
// }).catch(console.error);