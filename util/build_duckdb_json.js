'use strict';

import { readdir } from "node:fs/promises";
import { getCertificationHistory, sortProfileFileNames, CERTKEYLIST } from './helpers.js';

/*
 * Assemble the Cognito JSON profiles into a single file for DuckDB import
 */

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

const allProfiles = await Promise.all(
    profileFiles.map(async (file) => {

        const profileFile = Bun.file(`./profile_data/${file}`);
        const profile = await profileFile.json();
        // const fullName = profile.LegalName.FirstAndLast
        // const profileStatus = profile.ProfileStatus
        return profile
    })
)

const duckDbJsonFile = Bun.file("./duckDb.json");

await Bun.write(duckDbJsonFile, JSON.stringify(allProfiles, null, 2));