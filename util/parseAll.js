'use strict';

import { readdir } from "node:fs/promises";
import { getCertificationHistory, sortProfileFileNames, 
    cleanCognitoMyProfile, convertDesignationsForImport, convertTimeLimit } from './helpers.js';
import { getCognitoCertificateSchema } from "../schema/cognito_certificates_schema.js";
import { convertCognitoToWicket } from "./convert.js";
import { parseISO, differenceInDays, format } from "date-fns";
import { rules } from "./rules.js";
import { jsonToWorkbookOnDisk } from "./excel.js";
import { googleDriveUpload } from "./googleDrive.js";

const convertTestFile = Bun.file('test/util/convert.test.js')
const convertTestFileContent = await convertTestFile.text()
const cognitoProfileUrlPattern = /https:\/\/www.cognitoforms.com\/acmg\/acmgmyprofile\/entries\/1-all-entries\/\d+/g
const cognitoTestProfileUrlMatches = convertTestFileContent.match(cognitoProfileUrlPattern)

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
let ACTIVE_MEMBER_COUNT = 0
let INACTIVE_MEMBER_COUNT = 0

const timeLimitExtensionsJson = {
    'Field Descriptions': []
}

const membershipImportJson = {
    'Import Template': []
}

const cognitoProfileJson = {
    'Field Descriptions': []
}

const designationsJson = {
    'Field Descriptions': []
}

const buildTimeLimitsObject = (memberNumber, extensions) => {

    const fieldMap = {
        AAG: 'data[agexamextension]',
        AHG: 'data[hgexamextension]',
        ARG: 'data[rgexamextension]',
        ASG: 'data[sgexamextension]'
    }

    const tlo = {
        Entity: 'Person',
        'ID Scope': 'Identifying Number',
        'ID': undefined,
        'data[agexamextension]': '',
        'data[hgexamextension]': '',
        'data[rgexamextension]': '',
        'data[sgexamextension]': ''
    }
    tlo['ID'] = memberNumber

    extensions.forEach((timeLimit) => {

        tlo[fieldMap[Object.keys(timeLimit)[0]]] = Object.values(timeLimit)[0]
    })

    return tlo
}

const buildCognitoJsonArchiveObject = (memberNumber, profile) => {

    const cleanProfileJsonString = cleanCognitoMyProfile(profile)

    const cognitoJson = {
        Entity: 'Person',
        'ID Scope': 'Identifying Number',
        'ID': undefined,
        'data[memberarchive]': cleanProfileJsonString
    }
    cognitoJson['ID'] = memberNumber

    return cognitoJson
}

const buildPersonMembershipObject = (memberNumber, tier) => {

    const personMembership = {
        Entity: 'Person',
        'ID Scope': 'Identifying Number',
        'ID': undefined,
        'Membership Tier Slug': undefined,
        'Start Date': undefined,
        'End Date': undefined,
        'Membership Owner ID Scope': '',
        'Membership Owner ID': '',
        'Enable Cascade': '',
        'Cascade Type': '',
        'Allowed Relationship Types': ''
    }

    personMembership['ID'] = memberNumber
    personMembership['Membership Tier Slug'] = tier[0]
    personMembership['Start Date'] = tier[2]
    personMembership['End Date'] = tier[3]

    return personMembership
}

const buildDesignationsObject = (memberNumber, designations) => {

    const designationsEntry = {
        Entity: 'Person',
        'ID Scope': 'Identifying Number',
        'ID': undefined,
        'data[mgrecentcert]': '',
        'data[sgrecentcert]': '',
        'data[asgrecentcert]': '',
        'data[pasgrecentcert]': '',
        'data[agrecentcert]': '',
        'data[aagrecentcert]': '',
        'data[paagrecentcert]': '',
        'data[rgrecentcert]': '',
        'data[argrecentcert]': '',
        'data[pargrecentcert]': '',
        'data[hgrecentcert]': '',
        'data[hgbridgerecentcert]': '',
        'data[ahgrecentcert]': '',
        'data[pahgrecentcert]': '',
        'data[wtrecentcert]': '',
        'data[dhgrecentcert]': '',
        'data[cgil1recentcert]': '',
        'data[cgil2recentcert]': '',
        'data[cgil3recentcert]': '',
        'data[trcirecentcert]': '',
        'data[vfgrecentcert]': ''
    }

    designationsEntry['ID'] = memberNumber

    // convert the designations keys
    const convertedDesignations = convertDesignationsForImport(designations)
    
    // for each entry in the converted designations, write it to the main object: 
    Object.keys(convertedDesignations).forEach((dkey) => {

        designationsEntry[dkey] = convertedDesignations[dkey]
    })

    return designationsEntry
}


const inspect = ''
let mostRecentlyUpdatedDate = new Date('1979-12-24T00:00:00.000Z')
const profiles = {}
for (const file of sortedProfileFileNames) {

    if (inspect === '' || file === inspect) {

        const profileFile = Bun.file(`./profile_data/${file}`);
        const profile = await profileFile.json();

        // Skip any non-relevant Cognito Profiles
        if (!['ACTIVE', 'INACTIVE', 'RESIGNED'].includes(profile.ProfileStatus)) continue                          // skip processing

        // Mar 22, 2025 - MM, KD business decision reached to SKIP resigned members where the DateEnd is missing
        if (profile.ProfileStatus === 'RESIGNED' && !profile.DateEnd ) continue                                    // skip processing
        // AND where the DateEnd is before 2021-01-01.
        if (profile.ProfileStatus === 'RESIGNED' && parseISO(profile.DateEnd) < parseISO('2021-01-01') ) continue  // skip processing


        const entryName = file.replace('.', '_')
        profiles[entryName] = {
            cognitoEntryId: `${entryName.split('_')[0]}`,
            isFormalTestProfile: cognitoTestProfileUrlMatches.includes(`https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${file.split('.')[0]}`) ? true : undefined,
            profileStatus: profile.ProfileStatus,
            memberNumber: profile.MemberNumber,
            cognitoLastModified: profile.Entry.DateUpdated
        }
        const profileLastUpdatedDate = parseISO(profile.Entry.DateUpdated)
        if (profileLastUpdatedDate > mostRecentlyUpdatedDate) {
            mostRecentlyUpdatedDate = profileLastUpdatedDate
        }
        
        if (['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_COUNT++
        if (profile.ProfileStatus === 'RESIGNED') NONMEMBER_COUNT++
        if (profile.ProfileStatus === 'ACTIVE') ACTIVE_MEMBER_COUNT++
        if (profile.ProfileStatus === 'INACTIVE') INACTIVE_MEMBER_COUNT++

        const cognito_certs = getCertificationHistory(profile)
        const parsedCognitoObject = cognitoCertificateSchema.safeParse(cognito_certs)

        // PARSING
        if (parsedCognitoObject.error) {

            profiles[entryName].parseError = parsedCognitoObject.error
            profiles[entryName].originalCerts = cognito_certs

            if (inspect === '') {

                if (['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_PARSE_ERRORS++
                if (profile.ProfileStatus === 'RESIGNED') NONMEMBER_PARSE_ERRORS++
                process.stdout.write(`>> PARSE_ERROR ${profile.ProfileStatus} [${file}] [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${file.split('.')[0]}]\n`)
                process.stdout.write(`${parsedCognitoObject.error}`)
                continue
            }
        }

        // CONVERSION
        else {
            profiles[entryName].certsParsed = parsedCognitoObject.data
            if (inspect === '') process.stdout.write(`>> ok ${profile.ProfileStatus} [${file}]\n`)
            try {
                const wicket = convertCognitoToWicket(parsedCognitoObject.data)
                profiles[entryName].wicketMemberships = wicket
                process.stdout.write(JSON.stringify(parsedCognitoObject.data) + '\n')
                process.stdout.write(JSON.stringify(wicket) + '\n')

                // At this point, we have successful Wicket Memberships for the person. 
                // Add each to the spreadsheet data:
                wicket.professional.forEach((membership) => {

                    // hydrate the membership
                    const personMembership = buildPersonMembershipObject(profile.MemberNumber, membership)
                    membershipImportJson['Import Template'].push(personMembership)

                    // And populate the structure for the Cognito JSON Archive:
                    const profileJson = buildCognitoJsonArchiveObject(profile.MemberNumber, profile)
                    cognitoProfileJson['Field Descriptions'].push(profileJson)
                })

                // Produce the designations output data
                const designationsOutput = buildDesignationsObject(profile.MemberNumber, wicket.designations)
                designationsJson['Field Descriptions'].push(designationsOutput)

                // Produce the Time Limit Extensions output data
                const limitCertMap = {
                    RockTimeLimit: 'ARG',
                    SkiTimeLimit: 'ASG',
                    AlpineTimeLimit: 'AAG',
                    HikeTimeLimit: 'AHG'
                }
                // collect any applicable time limit year values
                const applicableTimeLimits = Object.keys(limitCertMap).filter(timeLimit => Object.keys(parsedCognitoObject.data).includes(timeLimit));

                let tlObjectsArray = []
                if(applicableTimeLimits.length > 0){
                    // for each time limit, check for active apprentice certificate:
                    tlObjectsArray = applicableTimeLimits.map((timeLimit) => {

                        const convertedTimeLimit = convertTimeLimit(parsedCognitoObject.data[limitCertMap[timeLimit]].date, parsedCognitoObject.data[timeLimit])

                        if(convertedTimeLimit){

                            const tlObj = {}
                            tlObj[limitCertMap[timeLimit]] = convertedTimeLimit
                            return tlObj
                        }
                        return undefined
                    }).filter(n => n)
                }

                // And TimeLimits for Permanent Apprentices are identified and set here too:
                const PERM_APPRENTICE_EXTENSION = '2100-01-01' // 75 year horizon
                const perms = Object.keys(wicket.designations)
                    .filter(k => k.endsWith('isPermanent'))
                    .map(k => k.substring(0,3))
                
                perms.forEach((perm) => {

                    tlObjectsArray.push({[perm]: PERM_APPRENTICE_EXTENSION})
                })

                if(tlObjectsArray.length > 0){

                    const timeLimitsObj = buildTimeLimitsObject(profile.MemberNumber, tlObjectsArray)
                    process.stdout.write(`GOOP>> ${JSON.stringify(timeLimitsObj)}\n`)
                    timeLimitExtensionsJson['Field Descriptions'].push(timeLimitsObj)    
                }

                // prep Google API publish for Production

            } catch (error) {
                if (!['ACTIVE', 'INACTIVE'].includes(profile.ProfileStatus)) MEMBER_CONVERSION_ERRORS++
                if (profile.ProfileStatus === 'RESIGNED') NONMEMBER_CONVERSION_ERRORS++
                profiles[entryName].conversionError = error.message
                profiles[entryName].conversionErrorStack = error.stack
                process.stdout.write('Conversion Error >> ' + error.message + ' >> ' + JSON.stringify(parsedCognitoObject.data) + '\n')
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


// Produce the JSON Conversion Output
const jsonResultFile = Bun.file('public/data/conversion.json')

const result = {}
const info = {}
const stats = {
    MEMBER_PARSE_ERRORS: MEMBER_PARSE_ERRORS,
    MEMBER_PARSE_ERROR_RATE: `${parseFloat(`${memberParseErrorRate * 100}`).toFixed(2)}%`,
    MEMBER_CONVERSION_ERRORS: MEMBER_CONVERSION_ERRORS,
    MEMBER_CONVERSION_ERROR_RATE: `${parseFloat(`${memberConversionErrorRate * 100}`).toFixed(2)}%`,
    NONMEMBER_PARSE_ERRORS: NONMEMBER_PARSE_ERRORS,
    NONMEMBER_PARSE_ERROR_RATE: `${parseFloat(`${nonmemberParseErrorRate * 100}`).toFixed(2)}%`,
    NONMEMBER_CONVERSION_ERRORS: NONMEMBER_CONVERSION_ERRORS,
    NONMEMBER_CONVERSION_ERROR_RATE: `${parseFloat(`${nonmemberConversionErrorRate * 100}`).toFixed(2)}%`,
    MEMBER_COUNT: MEMBER_COUNT,
    NONMEMBER_COUNT: NONMEMBER_COUNT,
    ACTIVE_MEMBER_COUNT: ACTIVE_MEMBER_COUNT,
    INACTIVE_MEMBER_COUNT: INACTIVE_MEMBER_COUNT
}

info.reportGeneratedDate = new Date()
const runTimeStamp = format(info.reportGeneratedDate, "yyyy-MM-dd'T'HH:mm:ss")
console.log(runTimeStamp)
info.mostRecentlyUpdatedProfileDate = mostRecentlyUpdatedDate
info.daysSinceDataRefresh = differenceInDays(new Date(), mostRecentlyUpdatedDate)

result.info = info
result.stats = stats
result.profiles = profiles
await Bun.write(jsonResultFile, JSON.stringify(result, null, 2))

// Write the JSON Rules Output
const jsonRulesFile = Bun.file('public/data/rules.json')
await Bun.write(jsonRulesFile, JSON.stringify(rules, null, 2))

// Write the JSON Person Memberships Output
const jsonPersonMemberships = Bun.file('public/data/personMemberships.json')
await Bun.write(jsonPersonMemberships, JSON.stringify(membershipImportJson, null, 2))

// Write the Person Membership Excel Workbook: 
jsonToWorkbookOnDisk(membershipImportJson, './public/data/ACMG_Person_Memberships.xlsx')

// Write the Designations Excel Workbook: 
jsonToWorkbookOnDisk(designationsJson, './public/data/ACMG_Person_Designations.xlsx')

// Write the Cognito My Profile JSON Archive Workbook:
jsonToWorkbookOnDisk(cognitoProfileJson, './public/data/ACMG_CognitoMyProfile_JSON_Additional_Info.xlsx')

// Write the Exam Extension Dates Workbook
jsonToWorkbookOnDisk(timeLimitExtensionsJson, './public/data/ACMG_Person_Exam_Time_Limit_Extensions.xlsx')

// Google Drive Uploads
if(process.env.PUBLISH && process.env.PUBLISH.toLowerCase().trim() === 'true'){
    await googleDriveUpload('./public/data/ACMG_Person_Memberships.xlsx', runTimeStamp)
    await googleDriveUpload('./public/data/ACMG_Person_Designations.xlsx', runTimeStamp)
    await googleDriveUpload('./public/data/ACMG_CognitoMyProfile_JSON_Additional_Info.xlsx', runTimeStamp)
    await googleDriveUpload('./public/data/ACMG_Person_Exam_Time_Limit_Extensions.xlsx', runTimeStamp)
}
