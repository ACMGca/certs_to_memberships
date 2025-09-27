'use strict';

import { readdir } from "node:fs/promises";
import { parseISO } from "date-fns";
import { sortProfileFileNames } from './helpers.js';

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

console.log('Validate: PublicULID is matchable');

const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i

for (const file of sortedProfileFileNames) {

        const profileFile = Bun.file(`./profile_data/${file}`);
        const profile = await profileFile.json();

        // Skip any non-relevant Cognito Profiles
        if (!['ACTIVE', 'INACTIVE', 'RESIGNED'].includes(profile.ProfileStatus)) continue                          // skip processing

        // Mar 22, 2025 - MM, KD business decision reached to SKIP resigned members where the DateEnd is missing
        if (profile.ProfileStatus === 'RESIGNED' && !profile.DateEnd ) continue                                    // skip processing
        // AND where the DateEnd is before 2021-01-01.
        if (profile.ProfileStatus === 'RESIGNED' && parseISO(profile.DateEnd) < parseISO('2021-01-01') ) continue  // skip processing

        console.log(profile.PublicULID, profile.ProfileStatus, ulidRegex.test(profile.PublicULID)? true : 'nooooooooooooooooooooooo');
}

