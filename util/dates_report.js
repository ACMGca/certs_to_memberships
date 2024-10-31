'use strict';

import { readdir } from "node:fs/promises";

import { getCertificationHistory, sortProfileFileNames, CERTKEYLIST } from './helpers.js';

const certValidation = (certs) => {

    Object.keys(certs).forEach((certKey) => {

        if(certs[certKey] && !certs[certKey].date){
            
            if(!result.missingDates) result.missingDates = []
            result.missingDates.push(certKey)
        }
    })
}

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

// Read and parse each profile
let count = 0
for (const file of sortedProfileFileNames) {

    const profileFile = Bun.file(`./profile_data/${file}`);
    const profile = await profileFile.json();
    const fullName = profile.LegalName.FirstAndLast
    const profileStatus = profile.ProfileStatus

    if(profileStatus.endsWith('CTIVE')){

        const certs = getCertificationHistory(profile)

        // are you missing dates on things we care about to create professional memberships? 
        const dateProblem = Object.keys(certs).reduce((acc, cur) => {

            if(certs && !certs[cur].date && cur !== 'HGWTs'){

                console.log('---')
                console.log(`${++count}`, fullName, cur, `(${profileStatus})`, `https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${file.split('.')[0]}`)
                console.log(JSON.stringify(certs, null, 2))
            }
            return acc
        }, false)

        if(dateProblem){

            // console.log(++count, fullName)
        }
    }

}
