import { readdir } from "node:fs/promises";

const CERTKEYLIST = ['MG','AG','SG','RG','AAG','ASG','ARG','AHG','DHG','HG','HGWT','CGI1','CGI2','CGI3','TRCI','VFG','AHGPerm','AAGPerm','ASGPerm','ARGPerm']

const sortProfileFileNames = (a,b) => {

    if(Number(a.split('.')[0]) < Number(b.split('.')[0])){
        return -1
    }else if(Number(a.split('.')[0]) > Number(b.split('.')[0])){
        return 1
    }else{
        return 0
    }
}

// Determine if the profile contains evidence of prior certification
const getCertificationHistory = (profile) => {

    const certs = CERTKEYLIST.reduce((acc, cur) => {

        if((profile[cur] || profile[`${cur}Date`] || profile[`${cur}LastModified`])){
            acc[cur] = {}
            acc[cur].status = profile[cur]
            acc[cur].date = profile[`${cur}Date`]
            acc[cur].lastModified = profile[`${cur}LastModified`]
        }

        return acc
    }, {})

    return Object.keys(certs).length > 0 ? certs : null
}

// Given indication of certification, assess the available data for completeness and correctness
const certValidation = (certs) => {

    if(!certs) return null
    const result = { valid: false }
    // Let's look for problems... 

    // 1. If we have a cert with a status but no date, it will be hard to bracket membership time frame.
    Object.keys(certs).forEach((certKey) => {

        if(certs[certKey] && !certs[certKey].date){
            
            if(!result.missingDates) result.missingDates = []
            result.missingDates.push(certKey)
        }
    })
    // 2. If the number of missing dates is the same as the number of certs, it means we have NO DATES AT ALL to work with: 
    if(result.missingDates && result.missingDates.length === Object.keys(certs).length) result.noCertificateDates = true
    
    // 3. [ TODO ] It's possible that some profiles have certificates which are active but should not be because of
    //    supersedence rules. 

    // 4. [ TODO ] The profile should be deterministically convertible to Wicket Membership format
    //    This need the most work to create the function and test cases to prove that we can do this for the existing data.

    if(Object.keys(result).length === 1) result.valid = true
    return result
}

const profileFiles = await readdir('./profile_data');
const sortedProfileFileNames = profileFiles.sort(sortProfileFileNames)

// Read and parse each profile
let profileCount = 0
let memberCount = 0
let professionalCount = 0
let resignedCount = 0
let resignedProblemCount = 0
let validationProblemCount = 0
let memberProblemCount = 0
let resignedAndDateless = 0
for (const file of sortedProfileFileNames) {

    profileCount++
    const profileFile = Bun.file(`./profile_data/${file}`);
    const profile = await profileFile.json();
    const profileStatus = profile.ProfileStatus
    if(profileStatus.endsWith('CTIVE')) {memberCount++; professionalCount++}
    if(profileStatus === 'RESIGNED') {resignedCount++; professionalCount++}
    const certs = getCertificationHistory(profile)
    const validation = certValidation(certs)

    // If there are no certificate dates on the profile, we want to know if there are other dates we can use:
    if(validation && !validation.valid && validation.noCertificateDates && !profile.DateJoined) validation.noJoinDate = true
    if(profileStatus === 'RESIGNED' && validation.noCertificateDates && validation.noJoinDate) resignedAndDateless++
    if(validation && !validation.valid) validationProblemCount++
    if(validation && !validation.valid && profileStatus.endsWith('CTIVE')) memberProblemCount++
    if(validation && !validation.valid && profileStatus === 'RESIGNED') resignedProblemCount++
    // console.log('\u0007');
    console.log(profileStatus, `${(certs && Object.keys(certs).length > 0) ? 'GUIDE': '_NOT_'}`, file, JSON.stringify(validation))
}

console.log(`\n\n---\nProfile Total Count: ${profileCount}`)

console.log(`\n\n---\nRESIGNED & Without Any Dates Count: ${resignedAndDateless}`)

console.log(`\n\n---\nProfessional Total Count: ${professionalCount}`)
console.log(`Validation Problem Count: ${validationProblemCount}`)
console.log(`Validation Problem Rate: ${Math.round(validationProblemCount/professionalCount*100, 0)}%`)

console.log(`\n\n---\nMember Total Count: ${memberCount}`)
console.log(`Member Problem Count: ${memberProblemCount}`)
console.log(`Validation Problem Rate: ${Math.round(memberProblemCount/memberCount*100, 0)}%`)

console.log(`\n\n---\nResigned Total Count: ${resignedCount}`)
console.log(`Resigned Problem Count: ${resignedProblemCount}`)
console.log(`Validation Problem Rate: ${Math.round(resignedProblemCount/resignedCount*100, 0)}%`)