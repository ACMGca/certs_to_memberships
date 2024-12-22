'use strict';

import { readdir } from "node:fs/promises";
import { getCertificationHistory, sortProfileFileNames, CERTKEYLIST } from './helpers.js';
import { getCognitoCertificateSchema } from "../schema/cognito_certificates_schema.js";
import { convertCognitoToWicket } from "./convert.js";

const cognitoCertificateSchema = getCognitoCertificateSchema()

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

// Read, parse, and convert each profile. 
// We care about member vs. non-member and parsing errors versus conversion errors.
// The goal is ZERO Member Parsing and Conversion Errors
// Also FEW Non-Member Parsing Errors but a tolerance for Non-Member Conversion errors
let MEMBER_PARSE_ERRORS = 0
let NONMEMBER_PARSE_ERRORS = 0
let MEMBER_CONVERSION_ERRORS = 0
let NONMEMBER_CONVERSION_ERRORS = 0
let MEMBER_COUNT = 0
let NONMEMBER_COUNT = 0
let ACTIVE_MEMBER_COUNT=0
let INACTIVE_MEMBER_COUNT=0

const inspect = ''
for (const file of sortedProfileFileNames) {

    if(inspect === '' || file === inspect){
        const profileFile = Bun.file(`./profile_data/${file}`);
        const profile = await profileFile.json();

        // Skip any non-relevant Cognito Profiles
        if(!['ACTIVE', 'INACTIVE', 'RESIGNED'].includes(profile.ProfileStatus)) continue 
        if(['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_COUNT++
        if(profile.ProfileStatus === 'RESIGNED') NONMEMBER_COUNT++
        if(profile.ProfileStatus === 'ACTIVE') ACTIVE_MEMBER_COUNT++
        if(profile.ProfileStatus === 'INACTIVE') INACTIVE_MEMBER_COUNT++
        
        const cognito_certs = getCertificationHistory(profile)

        const parsedCognitoObject = cognitoCertificateSchema.safeParse(cognito_certs)

        // PARSING
        if(parsedCognitoObject.error){

            if(inspect === '' ){

                if(['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_PARSE_ERRORS++
                if(profile.ProfileStatus === 'RESIGNED') NONMEMBER_PARSE_ERRORS++
                process.stdout.write(`>> PARSE_ERROR ${profile.ProfileStatus} [${file}] [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${file.split('.')[0]}]\n`)
                process.stdout.write(`${parsedCognitoObject.error}`)
                continue
            }
        }

        // CONVERSION
        else{
            if(inspect === '') process.stdout.write(`>> ok ${profile.ProfileStatus} [${file}]\n`)
            try {
                const wicket = convertCognitoToWicket(parsedCognitoObject.data)
                process.stdout.write(JSON.stringify(parsedCognitoObject.data)+'\n')
                process.stdout.write(JSON.stringify(wicket)+'\n')
            } catch (error) {
                if(!['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_CONVERSION_ERRORS++
                if(profile.ProfileStatus === 'RESIGNED') NONMEMBER_CONVERSION_ERRORS++
                process.stdout.write('conversion error! INSPECT! >> ' + error.message + ' >> ' + JSON.stringify(parsedCognitoObject.data) + '\n')
            }            
        }
    }
}

const memberParseErrorRate = MEMBER_PARSE_ERRORS / MEMBER_COUNT
const memberConversionErrorRate = MEMBER_CONVERSION_ERRORS / MEMBER_COUNT
const nonmemberParseErrorRate = NONMEMBER_PARSE_ERRORS / NONMEMBER_COUNT
const nonmemberConversionErrorRate = NONMEMBER_CONVERSION_ERRORS / NONMEMBER_COUNT

process.stdout.write(`\n\nSTATS >>\nMEMBER_PARSE_ERRORS\t\t${MEMBER_PARSE_ERRORS} (${parseFloat(`${memberParseErrorRate * 100}`).toFixed(2)}%)\n`)
process.stdout.write(`MEMBER_CONVERSION_ERRORS\t${MEMBER_CONVERSION_ERRORS} (${parseFloat(`${memberConversionErrorRate * 100}`).toFixed(2)}%)\n`)
process.stdout.write(`NONMEMBER_PARSE_ERRORS\t\t${NONMEMBER_PARSE_ERRORS} (${parseFloat(`${nonmemberParseErrorRate * 100}`).toFixed(2)}%)\n`)
process.stdout.write(`NONMEMBER_CONVERSION_ERRORS\t${NONMEMBER_CONVERSION_ERRORS} (${parseFloat(`${nonmemberConversionErrorRate * 100}`).toFixed(2)}%)\n`)

process.stdout.write(`\nMEMBER_COUNT\t\t\t${MEMBER_COUNT}\n`)
process.stdout.write(`NONMEMBER_COUNT\t\t\t${NONMEMBER_COUNT}\n`)
process.stdout.write(`ACTIVE_MEMBER_COUNT\t\t${ACTIVE_MEMBER_COUNT}\n`)
process.stdout.write(`INACTIVE_MEMBER_COUNT\t\t${INACTIVE_MEMBER_COUNT}\n`)

