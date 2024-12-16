'use strict';

import { readdir } from "node:fs/promises";
import { getCertificationHistory, sortProfileFileNames, CERTKEYLIST } from './helpers.js';
import { getCognitoCertificateSchema } from "../schema/cognito_certificates_schema.js";
import { convertCognitoToWicket } from "./convert.js";

const cognitoCertificateSchema = getCognitoCertificateSchema()

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

// Read and parse each profile
let profileCount = 0
let memberCount = 0
let nonMemberCount = 0
let ok = 0
let notok = 0
const inspect = '3184.json'
for (const file of sortedProfileFileNames) {

    if(inspect === '' || file === inspect){
        const profileFile = Bun.file(`./profile_data/${file}`);
        const profile = await profileFile.json();
        if(!['ACTIVE', 'INACTIVE', 'RESIGNED'].includes(profile.ProfileStatus)) { nonMemberCount++ ; continue }
        
        profileCount++
        if(['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) memberCount++
        const cognito_certs = getCertificationHistory(profile)

        const parsedCognitoObject = cognitoCertificateSchema.safeParse(cognito_certs)
        if(parsedCognitoObject.error){

            notok++
            if(inspect === '' && profile.ProfileStatus === 'ACTIVE'){

                process.stdout.write(`${profileCount} >> NOT ok ${profile.ProfileStatus} [${file}] [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${file.split('.')[0]}]\n`)
                process.stdout.write(`${parsedCognitoObject.error}`)
            }
        }
        else{
            if(inspect === '') process.stdout.write(`${profileCount} >> ok ${profile.ProfileStatus} [${file}]\n`)
            try {
                const wicket = convertCognitoToWicket(parsedCognitoObject.data)
                // process.stdout.write(JSON.stringify(cognito_certs)+'\n')
                process.stdout.write(JSON.stringify(parsedCognitoObject.data)+'\n')
                process.stdout.write(JSON.stringify(wicket)+'\n')
                ok++
            } catch (error) {
                process.stdout.write('conversion error! INSPECT!\n')
            }
            
        }
    }
}

process.stdout.write(`\n\nok: ${ok}, not_ok: ${notok}, members: ${memberCount}, non-members: ${nonMemberCount}\n`)
