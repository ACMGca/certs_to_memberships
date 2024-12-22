'use strict';
import { sub, format, compareDesc, intervalToDuration, formatISODuration, isWithinInterval, parseISO, subDays } from "date-fns";
import { rules } from "./rules.js";
import { getCognitoCertificateSchema } from "../schema/cognito_certificates_schema.js";

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

    const decemberFirst2024 = new Date('2024-12-01T00:00:00.000Z')
    const decemberThirtyFirst2024 = new Date('2024-12-31T00:00:00.000Z')
    const decemberThirtyFirst2025 = new Date('2025-12-31T00:00:00.000Z')
    const lastAnnualValidationDate = parseISO(lastAnnualValidation)
    if (isNaN(lastAnnualValidationDate)) {
        throw new TypeError('ActiveMembershipEndDate could not be determined based on input: ' + lastAnnualValidation)
    }
    const compare = compareDesc(decemberFirst2024, lastAnnualValidationDate)

    return compare >= 0 ? decemberThirtyFirst2025 : decemberThirtyFirst2024
}

/*
GOAL: Given a Cognito Certificates object, convert it to a Wicket Memberships object.
*/
// TODO: This can be better if we also pass the ProfileStatus and the yyyy-MM-dd of the 
//       known membership year end date for this member (based on LastAnnualValidation)
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

        // If the `intersection` has a value, it means that other certificate 'superseded' the first one. 
        // And, based on that, we can use the start date of the second one to identify the end date of the first bracket.

        if (intersection.length > 0) {

            const supersedingCertKey = intersection[0]
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

    // Now we have the cert objects in the right order (asc by date).
    // For each of the certs on the cognito object, convert it to a date bracketed membership:
    wicket.professional = certsArray.map((cert) => {

        return convertCert(cert, cognito.LastAnnualValidation)
    })

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
    // the SoP acquired via the ASG training.
    //
    // To implement: Once we have the Wicket Membership date brackets, we can look for the two conditions
    // that would indicate the need to end AHG or HG and start either AHGW or HGW. 

    /**
    * This applies side effects to the Wicket object  by reference to affects the Tier Splitting for HGWT.
    * @param {Object} wicket - The wicket memberships object being build - this will have side effects by reference
    * @param {*} splitDate - The ISO Date string (yyyy-MM-dd) on which to split the membership
    */
    const winterTravelSplitter = (wicket, splitDate) => {

        const slugs = ['apprentice_hiking_guide', 'hiking_guide']
        const affectedMemberships = slugs.map((slug) => {

            return wicket.professional.findIndex((membership) => membership[0] === slug)
        })

        affectedMemberships.forEach((membershipIndex, slugIndex) => {

            if (membershipIndex > -1 && isWithinInterval(parseISO(splitDate), {
                start: parseISO(wicket.professional[membershipIndex][2]),
                end: parseISO(wicket.professional[membershipIndex][3])
            })) {

                // The original AHG Membership needs the following changes:
                // 1) If it was ACTIVE, it should be set in INACTIVE
                // 2) It should get a new END date set to `winterDesignationDateBySkiCertificate` minus one day

                // Clone the AHG Membership as the basis for the AHGW Membership
                const ahgMembershipClone = [...wicket.professional[membershipIndex]]
                wicket.professional[membershipIndex][1] = 'Inactive'
                wicket.professional[membershipIndex][3] = format(subDays(parseISO(splitDate), 1), 'yyyy-MM-dd')

                // A new AHGW Membership needs to be created. It is a copy of the original AHG Membership with:
                // 1) Gets the slug updated to include 'winter'
                // 2) Gets a START date set to `winterDesignationDateBySkiCertificate`
                // 3) Keeps the same END date as the original AHG
                ahgMembershipClone[0] = `${slugs[slugIndex]}_winter`
                ahgMembershipClone[2] = format(parseISO(splitDate), 'yyyy-MM-dd')

                // Push the new membership into the collection
                wicket.professional.push(ahgMembershipClone)
                // And re-sort it
                wicket.professional.sort(membershipSort)
            }
        })
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

    // IFMGA: For any active Mountain Guide with an IFMGA License Number > 0 and a SkiExamMode of 'Ski', 
    // an IFMGA Membership is implied. The approach is to clone the MG membership and change the
    // name of the Tier to IFMGA.
    // Any Active MG without an IFMGALicenseNumber > 0 would not receive an IFMGA Membership Tier in Wicket. 
    if (cognito.MG && cognito.MG.status === 'Active' && cognito.SkiExamMode === 'Ski' && Number(cognito.IFMGALicenseNumber) > 0) {

        // Find the MG membership on the Wicket object
        const mgMembership = wicket.professional.find((m) => m[0] === 'mountain_guide' && m[1] === 'Active')
        if (mgMembership) {
            const ifmgaMembership = [...mgMembership]
            ifmgaMembership[0] = 'ifmga' // just change the label
            wicket.professional.push(ifmgaMembership)
        }
    }


    // TODO: Based on the Cognito `ProfileStatus` we can infer what the 'tail' of the membership
    // object should look like:
    // - Active: One of the Professional Certified memberships should be 'Active' and hit the *future* membership end date
    // - Inactive: A "Professional Inactive" membership should be 'Active' and hit the *future* membership end date AND 
    //             all other Professional Certified memberships should have end dates in the past
    // - Resigned: Every membership should have end dates in the past

    // TODO: Detectable 'mid career' Inactive periods can be filled with "Professional Inactive" membership
    // TODO: Detectable 'mid career' Resigned periods can be void of any membership

    // console.log(wicket)
    return wicket
}