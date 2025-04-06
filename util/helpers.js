'use strict'
import { addMonths, isBefore, isAfter, parseISO, format } from "date-fns"

export const CERTKEYLIST = ['MG', 'AG', 'SG', 'RG', 'AAG', 'ASG', 'ARG', 'AHG', 'DHG', 'HG', 'HGWT', 'CGI1', 'CGI2', 'CGI3', 'TRCI', 'VFG', 'AHGPerm', 'AAGPerm', 'ASGPerm', 'ARGPerm']

export const sortProfileFileNames = (a, b) => {

    if (Number(a.split('.')[0]) < Number(b.split('.')[0])) {
        return -1
    } else if (Number(a.split('.')[0]) > Number(b.split('.')[0])) {
        return 1
    } else {
        return 0
    }
}

// Determine if the profile contains evidence of prior certification
export const getCertificationHistory = (profile) => {

    const certs = CERTKEYLIST.reduce((acc, cur) => {

        if ((profile[cur] || profile[`${cur}Date`] || profile[`${cur}LastModified`])) {
            acc[cur] = {}
            acc[cur].status = profile[cur]
            acc[cur].date = profile[`${cur}Date`]
            acc[cur].lastModified = profile[`${cur}LastModified`]
        }

        return acc


    }, {})

    const { ProfileStatus,
        DateJoined,
        DateEnd,
        DateReinstate,
        IFMGALicenseNumber,
        LastAnnualValidation,
        Mode,
        HikeTimeLimit,
        RockTimeLimit,
        AlpineTimeLimit,
        SkiTimeLimit,
    } = profile

    const result = {
        ProfileStatus,
        DateJoined,
        DateEnd,
        DateReinstate,
        LastAnnualValidation,
        IFMGALicenseNumber,
        SkiExamMode: Mode,
        HikeTimeLimit,
        RockTimeLimit,
        AlpineTimeLimit,
        SkiTimeLimit,
        ...certs
    }

    return Object.keys(certs).length > 0 ? result : null
}

/**
 * Add 44 months to a date
 * @param {Date} date 
 * @returns Date - the original date plus 44 months
 */
export const addFortyFourMonths = (date) => {

    if (!date || !date instanceof Date) throw new TypeError('Input must be a Date to add 44 months to it.')

    return addMonths(date, 44)
}

/**
 * Convert a Cognito My Profile data object into a simpler string representation of the same.
 * @param {Object} p - Profile object representing the original state from Cognito Forms
 * @returns {String} A stripped down, formatted, string representation of the original profile suitable for storage in Wicket MDP
 */
export const cleanCognitoMyProfile = (p) => {

    delete p.Form
    delete p.MemberPhoto
    delete p.FirstAidCertificate
    delete p.IFMGAPadLeft
    delete p.Entry.User
    delete p.Entry.Action
    delete p.Entry.Role
    delete p.Entry.Order
    delete p.Entry.PublicLink
    delete p.Entry.InternalLink
    delete p.Entry.Number
    delete p.Entry.Document1
    delete p.Entry.Document2
    delete p.Entry.Document3
    delete p.Entry.Document4
    Object.keys(p).forEach((k) => {

        if (!p[k]) delete p[k]
        if (k.endsWith('_QuantitySelected')) delete p[k]
        if (k.endsWith('_QuantityUsed')) delete p[k]
        if (k.endsWith('_QuantityLimit')) delete p[k]
        if (k.endsWith('_QuantityLimitCalculated')) delete p[k]
        if (k.endsWith('_IncrementBy')) delete p[k]
        if (k.endsWith('_Maximum')) delete p[k]
        if (Array.isArray(p[k]) && p[k].length === 0) delete p[k]
    })
    if (!p?.Nationality1?.Id) delete p.Nationality1
    if (!p?.Nationality2?.Id) delete p.Nationality2
    if (p.AdministrativeNotes && p.AdministrativeNotes.length > 0) {

        p.AdministrativeNotes.forEach((note) => {

            delete note.Id
            delete note.ItemNumber
        })
    }
    Object.keys(p.LegalName).forEach((k) => {

        if (!p.LegalName[k]) delete p.LegalName[k]
    })
    Object.keys(p.Residence).forEach((k) => {

        if (!p.Residence[k]) delete p.Residence[k]
        delete p.Residence.FullInternationalAddress
    })
    if (p.Mailing) {
        Object.keys(p.Mailing).forEach((k) => {

            if (!p.Mailing[k]) delete p.Mailing[k]
            delete p.Mailing.FullInternationalAddress
        })
        // If mailing is the same as residence, delete mailing
        const keepMailing = Object.keys(p.Residence).map((k) => {

            return p.Residence[k] !== p.Mailing[k]
        }).reduce((acc, cur) => {

            if (cur === true) acc = true
            return acc
        }, false)
        if (!keepMailing) delete p.Mailing
    }

    if (p.FirstAidProvider) {
        p.FirstAidProviderLabel = p.FirstAidProvider.Label
        delete p.FirstAidProvider
    }

    delete p.Id
    return JSON.stringify(p, null, 2)
}

/**
 * Split a date range based on a second date range
 * @param {Array} tierRange - The possibly 'outer' range representing the tier bracket
 * @param {Array} resignedRange - The possibly 'inner' range representing the resignation date range
 * @returns {Array} Either a single element array with the original date range, or 2 new date ranges
 */
export const splitMembershipBracket = (tierRange, resignedRange) => {

    const [tierStart, tierEnd] = tierRange;
    const [resignedStart, resignedEnd] = resignedRange;

    // Check if resignedRange is completely within tierRange
    if (isBefore(resignedStart, tierStart) || isAfter(resignedEnd, tierEnd)) {

        // resigned range is not completely inside the tier range
        return [tierRange];
    }

    // Split the tier range
    const range1 = [tierStart, resignedStart];
    const range2 = [resignedEnd, tierEnd];

    return [range1, range2];
}

export const convertDesignationsForImport = (designations) => {

    const dmap = {
        SG: 'data[sgrecentcert]',
        ASG: 'data[asgrecentcert]',
        AG: 'data[agrecentcert]',
        AAG: 'data[aagrecentcert]',
        RG: 'data[rgrecentcert]',
        ARG: 'data[argrecentcert]',
        HG: 'data[hgrecentcert]',
        AHG: 'data[ahgrecentcert]',
        HGWT: 'data[wtrecentcert]',
        DHG: 'data[dhgrecentcert]',
        CGI1: 'data[cgil1recentcert]',
        CGI2: 'data[cgil2recentcert]',
        CGI3: 'data[cgil3recentcert]',
        TRCI: 'data[trcirecentcert]',
        VFG: 'data[vfgrecentcert]'
    }

    const result = Object.keys(designations).reduce((acc, cur) => {


        const importKey = dmap[cur]

        // if we don't map something, throw
        if(!cur.endsWith('isPermanent') && !importKey){
            throw new Error(`FAILED_TO_MAP_DESIGNATION_IMPORT_KEY for "${cur}"`)
        }
        else{

            if(!/[a-z]/.test(cur)){

                acc[importKey] = designations[cur]
            }
        }

        return acc

    }, {})

    return result
}

export const convertTimeLimit = (designationDateString = null, timeLimitYearString = null) => {

    if(!designationDateString || !timeLimitYearString){
        return null
    }

    if(typeof timeLimitYearString !== 'string' || !/^[\d]{4}$/.test(timeLimitYearString)){

        throw new Error('timeLimitYear must be a 4 digit string year [yyyy]')
    }

    const designationDate = parseISO(designationDateString)

    if(typeof designationDateString !== 'string' || !/^[\d]{4}-[\d]{2}-[\d]{2}$/.test(designationDateString) || isNaN(designationDate)){

        throw new Error('designationDate must be an ISO format date string [yyyy-MM-dd]')
    }

    const designationDateYear = designationDate.getFullYear()
    const timeLimitYear = Number(timeLimitYearString)
    const yearsDifference = timeLimitYear - designationDateYear

    if(yearsDifference > 3){

        // calculate the appropriate time limit for Wicket
        const preciseTimeLimitDate = parseISO(`${String(timeLimitYear)}${designationDateString.substring(4)}`)

        // this is where we can add 8 months if that is the business decision
        const extendedTimeLimitDate = addMonths(preciseTimeLimitDate, 0)
        return format(extendedTimeLimitDate, 'yyyy-MM-dd')
    }
    return null
}

/**
 * Fetches a file from a given URL and saves it to the specified file path using Bun.file.
 *
 * @param {string} url The URL of the file to fetch.
 * @param {string} filePath The path where the file should be saved.
 * @returns {Promise<void>} A promise that resolves when the file is successfully fetched and saved,
 * or rejects if an error occurs.
 */
export const fetchAndSave = async (url, filePath) => {
    try {
      console.log(`Fetching file from: ${url}`);
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
  
      console.log(`Successfully fetched. Saving to: ${filePath}`);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
  
      await Bun.file(filePath).write(buffer);
      console.log(`File saved successfully to: ${filePath}`);
  
    } catch (error) {
      console.error(`Error fetching and saving file:`, error);
      throw error; // Re-throw the error for the caller to handle
    }
  }
