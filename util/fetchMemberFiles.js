'use strict';

import { fetchAndSave } from './helpers.js';
import { parseISO } from 'date-fns';

async function main() {
    const args = Bun.argv.slice(2);

    if (args.length !== 1) {
        console.error('Usage: bun run json_parser_bun_file.ts <filename>');
        process.exit(1);
    }

    const filename = args[0];

    try {
        const file = Bun.file(filename);

        if (!await file.exists()) {
            console.error(`Error: File not found: ${filename}`);
            process.exit(1);
        }

        const fileContent = await file.text();
        const profile = JSON.parse(fileContent);

        // Implement the same rules to not move files for Resigned Members before 2021
        const activeMember = (['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus))
        const recentlyResigned = (profile.ProfileStatus === 'RESIGNED' && profile.DateEnd && (parseISO(profile.DateEnd) >= parseISO('2021-01-01')))

        if (activeMember || recentlyResigned) {
            if (profile.MemberPhoto && profile.MemberPhoto.length === 1) {

                const photoData = profile.MemberPhoto[0]
                const fileName = `${profile.MemberNumber}.${photoData.ContentType.split('/')[1]}`
                console.log('Saving: ' + fileName + ' from: ' + photoData.File)
                await fetchAndSave(photoData.File, `public/files/memberFiles/member\ photos/${fileName}`)
            }

            if (profile.FirstAidCertificate && profile.FirstAidCertificate.length > 0) {

                profile.FirstAidCertificate.forEach(async (file, index, arr) => {

                    const fileName = `${profile.MemberNumber}${(arr.length > 1 && index > 0) ? `-${index + 1}` : ''}.${file.ContentType.split('/')[1]}`
                    console.log('Saving: ' + fileName + ' from: ' + file.File)
                    await fetchAndSave(file.File, `public/files/memberFiles/first\ aid/${fileName}`)
                })
            }
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Error: Invalid JSON format in file: ${filename}`);
            console.error(error.message);
        } else {
            console.error(`An unexpected error occurred: ${error.message}`);
        }
        process.exit(1);
    }
}

main()