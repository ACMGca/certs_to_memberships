'use strict';
import { sub, format, compareDesc, intervalToDuration, formatISODuration, isWithinInterval, parseISO, subDays, addDays } from "date-fns";
import { rules } from "./rules.js";
import { getCognitoCertificateSchema } from "../schema/cognito_certificates_schema.js";

// NOTE: ASCII titles used for emphasis in the code were generated here: 
// https://patorjk.com/software/taag/#p=display&f=Small&t=Type%20Something%20

const cognitoCertificateSchema = getCognitoCertificateSchema()

const certSort = (a, b) => {

    if (parseISO(a.date) < parseISO(b.date)) return -1
    if (parseISO(a.date) > parseISO(b.date)) return 1
    return 0
}

const membershipSort = (a, b) => {

    if (parseISO(a[2]) < parseISO(b[2])) return -1
    if (parseISO(a[2]) > parseISO(b[2])) return 1
    return 0
}

/**
 * Determine the correct end date for any Active Wicket Membership Tiers based on the 
 * last known value for the LastAnnualValidation date for the member.
 * Anything after Dec 01, 2024 gets a Dec 31, 2025 end date. Otherwise it gets Dec 31, 2024.
 * We should not need to be concerned about any dates prior to the 2024 renewal year because
 * they will not be being issued any active membership tiers in Wicket (Resigned profiles).
 * @param {String} lastAnnualValidation - ISO Format date yyyy-MM-dd of the last known annual validation date
 * @returns {Date} To be used as the end date of an Active Membership Tier
 * @throws {TypeError} When the date cannot be determined
 */
const getActiveMembershipEndDate = (lastAnnualValidation) => {

    const decemberFirst2024 = new Date('2024-12-01T12:00:00.000Z')
    const decemberThirtyFirst2024 = new Date('2024-12-31T12:00:00.000Z')
    const decemberThirtyFirst2025 = new Date('2025-12-31T12:00:00.000Z')
    const lastAnnualValidationDate = parseISO(lastAnnualValidation)
    if (isNaN(lastAnnualValidationDate)) {
        throw new TypeError('ActiveMembershipEndDate could not be determined based on input: ' + lastAnnualValidation)
    }
    const compare = compareDesc(decemberFirst2024, lastAnnualValidationDate)

    return compare >= 0 ? decemberThirtyFirst2025 : decemberThirtyFirst2024
}

/**
 * Given a Cognito Certificates object, convert it to a Wicket Memberships object.
 * @param {Object} cognito - Object representing the Cognito My Profile source data
 * @returns {Object} wicket - Object representing the Wicket Membership target data structure
 */
export const convertCognitoToWicket = (cognito) => {

    // Apply schema validation to the Cognito Certificate Object. 
    // We will use the validation errors to inform the inference strategies to be used
    // to identify other possibly usable dates.
    const parsedCognitoObject = cognitoCertificateSchema.safeParse(cognito)
    if (parsedCognitoObject.error) console.log(parsedCognitoObject.error)

    const wicket = { professional: [] }

    const convertCert = (certObject, lastAnnualValidation) => {

        // Prepare the stub of the result array
        const result = [undefined, undefined, undefined, undefined]

        // Get a reference to the 'rule' object for the type of certificate
        const certRule = rules[certObject.certKey]

        // Set the Membership Tier slug value that is needed for Wicket import:
        result[0] = certRule.membership_tier_slug

        // If there is a JoinDate and it is later than the Cert Date then we should use it as the start of the bracket
        // because it indicates that the member joined the ACMG after the TAP designation was awarded.
        let bracketStartDate = parseISO(certObject.date)
        if (cognito.DateJoined && (parseISO(cognito.DateJoined) > bracketStartDate)) {

            bracketStartDate = parseISO(cognito.DateJoined)
        }
        // That gives us enough information to set the start date of the first membership:
        result[2] = format(bracketStartDate, 'yyyy-MM-dd')

        // Now we need to determine if there is a certificate present which supersedes the first certificate.
        // If there is, we can use the start date of the second one to help to define the end date of the first bracket.
        // To do this, see if the `superseded_by` rule of the current cert intersects with other certs on the profile:
        const intersection = certRule.superseded_by.filter(x => certKeys.includes(x) && cognito[x].status !== 'RESIGNED');

        // If the `intersection` has a value, it means that another certificate 'superseded' the first one. 
        // And, based on that, we can use the start date of the second one to identify the end date of the first bracket.

        if (intersection.length > 0) {

            let supersedingCertKey
            if(intersection.length > 1){

                // This is an interesting case. When a member has multiple certs which allowably supersede the current one,
                // we need to choose the earliest of the options:
                const earliestSupersedingCert = intersection.reduce((acc, cur) => {

                    if(acc.key === null || parseISO(cognito[cur].date) < acc.date){

                        acc.key = cur
                        acc.date = parseISO(cognito[cur].date)
                    }
                    return acc
                },{key: null, date: new Date()})
                supersedingCertKey = earliestSupersedingCert.key
            }
            else{
                // by default, take the one and only
                supersedingCertKey = intersection[0]
            }
            
            const supersedingCertDate = parseISO(cognito[supersedingCertKey].date)
            // Subtract one day so it ends the day before the next one starts
            const certDateLessOneDay = sub(supersedingCertDate, { days: 1 })
            result[3] = format(certDateLessOneDay, 'yyyy-MM-dd')

            // We know that this first certificate was superseded so it must be a past and Inactive membership.
            const endDateInPast = compareDesc(certDateLessOneDay, new Date())
            if (endDateInPast === 1) {
                result[1] = 'Inactive'
            }
            else {
                throw new Error('ERROR>> The superseded certificate end date was not in the past. This is a data issue.')
            }
        }
        else {
            if (certObject.status && certObject.status.toLowerCase() === 'active') {
                result[1] = 'Active'
                // We have determined that the certificate is active so we should let it last until 
                // the end of the current membership year.
                result[3] = format(getActiveMembershipEndDate(lastAnnualValidation), 'yyyy-MM-dd')
            }
            else if(certObject.status && certObject.status.toLowerCase() !== 'active' && certObject.lastModified && new Date() > parseISO(certObject.lastModified)){
                result[1] = 'Inactive'
                // The bracket should end on the indicated last modified date
                result[3] = format(parseISO(certObject.lastModified), 'yyyy-MM-dd')
            }
        }

        // Prevent the return of invalid Tier results by throwing an error if anything is undefined:
        if(result.includes(undefined)) throw new Error(`Invalid Membership Tier Result: ${JSON.stringify(result)}`)

        return result
    }

    // Determine the keys of the certs on the object
    const certKeys = Object.keys(rules).filter(x => Object.keys(parsedCognitoObject.data).includes(x))

    // Now we know the cert keys we are working with. Build a array we can sort based on cert dates:
    const certsArray = certKeys.map((certKey) => {

        return { ...parsedCognitoObject.data[certKey], certKey }
    }).sort(certSort)


    //    _                      _     _  _     _    _               __ __   __   _     _            _     _       __  
    //   /_\  __ __ ___ _  _ _ _| |_  | || |___| |__| |___ _ _ ___  / / \ \ / /__| |_  | |_ ___   _ | |___(_)_ _   \ \ 
    //  / _ \/ _/ _/ _ \ || | ' \  _| | __ / _ \ / _` / -_) '_(_-< | |   \ V / -_)  _| |  _/ _ \ | || / _ \ | ' \   | |
    // /_/ \_\__\__\___/\_,_|_||_\__| |_||_\___/_\__,_\___|_| /__/ | |    |_|\___|\__|  \__\___/  \__/\___/_|_||_|  | |
    //                                                              \_\                                            /_/ 
    // We can have Active Certificates on profiles of people who are not yet members. These are "Account Holders" who have yet to formally
    // join the ACMG. This happens when MemberServices is setting someone up to be able to join for the first time, 
    // but the person has not actioned it yet.
    // If this is the case, the LastAnnualValidation=null and we SHOULD NOT create any Wicket Memberships for them:
    // (We need to know if they have at least one Active Certificate to apply this logic...)
    // *** When this assessment applies, the process returns early and the rest of the following logic steps are skipped. ***
    const hasActiveCert = certsArray.reduce((acc, cur) => {

        if(cur.status === 'Active'){
            acc = true
        }
        return acc
    }, false)
    if(!cognito.LastAnnualValidation && hasActiveCert){
        
        wicket.professional = [] // It becomes a valid conversion to receive no Wicket Memberships
        
        return wicket // *** RETURN EARLY *** as none of the remaining conversion logic is applicable
    }



    //  ___      _ _   _      _    ___                        _            ___                       
    // |_ _|_ _ (_) |_(_)__ _| |  / __|___ _ ___ _____ _ _ __(_)___ _ _   | _ \_ _ ___  __ ___ ______
    //  | || ' \| |  _| / _` | | | (__/ _ \ ' \ V / -_) '_(_-< / _ \ ' \  |  _/ '_/ _ \/ _/ -_|_-<_-<
    // |___|_||_|_|\__|_\__,_|_|  \___\___/_||_\_/\___|_| /__/_\___/_||_| |_| |_| \___/\__\___/__/__/                                                                                          
    // Now we have the cert objects in the right order (asc by date).
    // For each of the certs on the cognito object, convert it to a date bracketed Wicket Membership Tier:
    wicket.professional = certsArray.map((cert) => {

        const convertedCert = convertCert(cert, cognito.LastAnnualValidation)
        return convertedCert
    })

    //  ___             ___              __  __           _                _    _         
    // / _ \ _ _  ___  |   \ __ _ _  _  |  \/  |___ _ __ | |__  ___ _ _ __| |_ (_)_ __ ___
    //| (_) | ' \/ -_) | |) / _` | || | | |\/| / -_) '  \| '_ \/ -_) '_(_-< ' \| | '_ (_-<
    // \___/|_||_\___| |___/\__,_|\_, | |_|  |_\___|_|_|_|_.__/\___|_| /__/_||_|_| .__/__/
    //                            |__/                                           |_|      
    // Due to supersedence rules, it is possible for the converter to introduce a 'one-day membership'. 
    // For example, an Alpine Guide passing a Ski Guide Exam technically becomes a Ski Guide for one day
    // because the Ski Guide Membership is immediately superseded by Mountain Guide.
    // For this reason, one-day memberships are not really useful data and we will remove them 
    // from the conversion result: 
    wicket.professional = wicket.professional.filter((membership) => {

        // remove memberships with a one-day duration
        const duration = formatISODuration(intervalToDuration({
            start: parseISO(membership[2]),
            end: parseISO(membership[3])
        }))
        return duration !== 'P0Y0M0DT0H0M0S' && duration !== 'P0Y0M-1DT0H0M0S' // zero or one days in ISO duration format
    })

    // __      ___     _             _____                 _ 
    // \ \    / (_)_ _| |_ ___ _ _  |_   _| _ __ ___ _____| |
    //  \ \/\/ /| | ' \  _/ -_) '_|   | || '_/ _` \ V / -_) |
    //   \_/\_/ |_|_||_\__\___|_|     |_||_| \__,_|\_/\___|_|                                                   
    // Winter Travel - `Implicit` Due to Skiing Scope of Practice OR `Explicit` due to designation date set on HGWT
    // The Winter Travel Certificate (WT) in the source data is an indicator that a member has an
    // enhanced Scope of Practice at the AHG or HG scope to include winter hiking. In the past, this
    // was expressed with the anomalous addition of the WT certificate. However, we wish to move to
    // a standard 1:1 expression of Membership to Scope of Practice. Therefore, a AHG or HG with WT
    // becomes AHGW or HGW to denote the winter scope of practice by the unique membership type.
    // Additionally, there are two different paths to acquiring the winter SoP:
    // An AHG or HG who receives the WT TAP designation becomes AHGW or HGW on the WT date.
    // (This is denoted by an explicit date on the HGWT certificate)
    // Alternatively an AHG or HG who becomes ASG, automatically becomes either AHGW or HGW due to
    // the SoP acquired via the ASG training on that designation date.
    //
    // To implement: Once we have the Wicket Membership date brackets, we can look for the two conditions
    // that would indicate the need to end AHG or HG and start either AHGW or HGW. 

    /**
    * This applies side effects to the Wicket object  by reference to affect the Tier Splitting for HGWT.
    * @param {Object} wicket - The wicket memberships object - this will have side effects by reference
    * @param {*} splitDate - The ISO Date string (yyyy-MM-dd) on which to split the membership
    */
    const winterTravelSplitter = (wicket, splitDate) => {

        const slugs = ['apprentice-hiking-guide', 'hiking-guide']
        const affectedMemberships = slugs.map((slug) => {

            return wicket.professional.findIndex((membership) => membership[0] === slug)
        })

        affectedMemberships.forEach((membershipIndex, slugIndex) => {

            if (membershipIndex > -1 && isWithinInterval(parseISO(splitDate), {
                start: parseISO(wicket.professional[membershipIndex][2]),
                end: parseISO(wicket.professional[membershipIndex][3])
            })) {

                // The original Membership needs the following changes:
                // 1) If it was ACTIVE, it should be set in INACTIVE
                // 2) It should get a new END date set to `winterDesignationDateBySkiCertificate` minus one day

                // Clone the Membership as the basis for the Winter Membership
                const membershipClone = [...wicket.professional[membershipIndex]]
                wicket.professional[membershipIndex][1] = 'Inactive'
                wicket.professional[membershipIndex][3] = format(subDays(parseISO(splitDate), 1), 'yyyy-MM-dd')

                // A new Membership needs to be created. It is a copy of the original Membership with:
                // 1) Gets the slug updated to include 'winter'
                // 2) Gets a START date set to `winterDesignationDateBySkiCertificate`
                // 3) Keeps the same END date as the original Membership
                membershipClone[0] = `${slugs[slugIndex]}-winter`
                membershipClone[2] = format(parseISO(splitDate), 'yyyy-MM-dd')

                // Push the new membership into the collection
                wicket.professional.push(membershipClone)
            }
            else{
                // IF this is a *hiking_* membership that started after the split date
                // then it needs to be relabeled as a _winter membership:
                if(wicket.professional[membershipIndex] && 
                   wicket.professional[membershipIndex][0].includes('hiking-') && 
                   parseISO(wicket.professional[membershipIndex][2]) > parseISO(splitDate))
                {
                    wicket.professional[membershipIndex][0] = `${wicket.professional[membershipIndex][0]}-winter`
                }
            }
        })
        // Lastly, re-sort it
        wicket.professional.sort(membershipSort)
    }

    const winterDesignationDateBySkiCertificate = (
        parsedCognitoObject.data.HGWT &&
        !parsedCognitoObject.data.HGWT.date &&
        parsedCognitoObject.data.HGWT.status === 'Acquired' &&
        (parsedCognitoObject.data.ASG.date || parsedCognitoObject.data.SG.date)
    )

    // IMPLICIT WT
    if (winterDesignationDateBySkiCertificate) {

        winterTravelSplitter(wicket, winterDesignationDateBySkiCertificate)
    }

    // EXPLICIT WT
    if (parsedCognitoObject.data?.HGWT?.date) {

        winterTravelSplitter(wicket, parsedCognitoObject.data.HGWT.date)
    }


    //  ___ ___ __  __  ___   _   
    // |_ _| __|  \/  |/ __| /_\  
    //  | || _|| |\/| | (_ |/ _ \ 
    // |___|_| |_|  |_|\___/_/ \_\                        
    // IFMGA: Note that there is no TAP Designation for IFMGA. It is a separate concept related to
    // the status of being a Mountain Guide. This includes the idea that the member has paid IFMGA 
    // dues as am additional line item to the IFMGA via the ACMG renewal. 
    // For any active Mountain Guide with an IFMGA License Number > 0 and a SkiExamMode of 'Ski', 
    // an IFMGA Membership is implied. The approach is to clone the MG membership and change the
    // name of the Tier to IFMGA.
    // Any Active MG without an IFMGALicenseNumber > 0 would not receive an IFMGA Membership Tier in Wicket. 
    if (cognito.MG && cognito.MG.status === 'Active' && cognito.SkiExamMode === 'Ski' && Number(cognito.IFMGALicenseNumber) > 0) {

        // Find the MG membership on the Wicket object
        const mgMembership = wicket.professional.find((m) => m[0] === 'mountain-guide' && m[1] === 'Active')
        if (mgMembership) {
            const ifmgaMembership = [...mgMembership]
            ifmgaMembership[0] = 'ifmga' // just change the label
            wicket.professional.push(ifmgaMembership)
        }
    }

    //  ___              _   _           __  __           _                _    _      
    // |_ _|_ _  __ _ __| |_(_)_ _____  |  \/  |___ _ __ | |__  ___ _ _ __| |_ (_)_ __ 
    //  | || ' \/ _` / _|  _| \ V / -_) | |\/| / -_) '  \| '_ \/ -_) '_(_-< ' \| | '_ \
    // |___|_||_\__,_\__|\__|_|\_/\___| |_|  |_\___|_|_|_|_.__/\___|_| /__/_||_|_| .__/
    //                                                                           |_|   
    // INACTIVE MEMBERS are actually ***Active*** "Inactive Members" in a Wicket Membership Tier context.
    // Here we can know if this is an applicable condition based on the Cognito reported ProfileStatus. 
    if(cognito.ProfileStatus && cognito.ProfileStatus === 'INACTIVE'){

        // The assumption is that all of the Wicket Memberships calculated to this point are Inactive with End Dates in the past.
        // The new Inactive Member Tier to be created needs a start date one day after the last end date
        // and an End Date that is appropriate given the LastAnnualValidation date.

        // Identify the latest end date: 
        const seedDate = new Date('1940-01-01T00:00:00.000Z')
        const latestEndDate = wicket.professional.reduce((acc, cur) => {

            const tierEndDate = parseISO(cur[3])
            if(tierEndDate >= acc){
                acc = tierEndDate
            }
            return acc
        }, seedDate) // seeded with a long ago date
        
        // Create the new Inactive Tier bracket:
        const inactiveStartDate = addDays(latestEndDate, 1)
        const inactiveEndDate = getActiveMembershipEndDate(cognito.LastAnnualValidation)
        const inactiveMembershipTier = [
            'inactive-member',
            'Active',
            format(inactiveStartDate, 'yyyy-MM-dd'),
            format(inactiveEndDate, 'yyyy-MM-dd')
        ]

        // Protect against obviously incorrect dates: 
        // Ie. - The person should have been something otherwise detectable prior to becoming Inactive
        if(seedDate.toString() === latestEndDate.toString()){
            throw new Error('Inactive Member profile lacks prior membership history.')
        }
        // And push it to the Wicket Professional memberships set:
        wicket.professional.push(inactiveMembershipTier)
    }

    // ___              _ _    _   _____ _           ___       _          
    // |_ _|_ ___ ____ _| (_)__| | |_   _(_)___ _ _  |   \ __ _| |_ ___ ___
    //  | || ' \ V / _` | | / _` |   | | | / -_) '_| | |) / _` |  _/ -_|_-<
    // |___|_||_\_/\__,_|_|_\__,_|   |_| |_\___|_|   |___/\__,_|\__\___/__/
    //
    // We have observed some Tiers produced through the converter which create start dates before end dates.
    // This is obviously incorrect. For now, we should detect these and note the error
    wicket.professional.forEach((membership) => {

        const tierStartDate = parseISO(membership[2])
        const tierEndDate = parseISO(membership[3])
        if(tierStartDate > tierEndDate){
            //throw new Error(`[${membership[0]}] Membership tier start date must be before end date.`)
        }
    })                                                                        


    // TODO: Detectable 'mid career' Inactive periods can be filled with "Professional Inactive" membership
    // TODO: Detectable 'mid career' Resigned periods can be void of any membership
    return wicket
}