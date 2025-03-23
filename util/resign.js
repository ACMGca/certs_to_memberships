import { workbookToJSON } from "./excel.js";
import { getCertificationHistory, CERTKEYLIST } from "./helpers.js";
import { parseISO, format } from "date-fns";

const workbookFilePath = './public/data/2025_Membership_Renewal_Resignations.xlsx'

const data = workbookToJSON(workbookFilePath)

const inactives = data.Before.filter(p => p.ProfileStatus === 'INACTIVE')

inactives.forEach((p) => {

    try {
        const c = getCertificationHistory(p)
    
        // For any certs that are inactive, collect the lastModified date where it exists
        const inactiveLastModifiedDates = Object.keys(c).map((k) => {
    
            if(CERTKEYLIST.includes(k) && c[k] && c[k].status === 'Inactive' && c[k].lastModified && c[k].lastModified.length > 0 ){
                return parseISO(c[k].lastModified)
            }
        })
        .filter(e => e) // remove undefined
        .sort()
        
        const mostRecentInactiveDate = inactiveLastModifiedDates[inactiveLastModifiedDates.length - 1]
    
        console.log(`https://www.cognitoforms.com/acmg/acmgmyprofile/1-all-entries/${p.ACMGMyProfile_Id},`, format(mostRecentInactiveDate, 'yyyy-MM-dd'))   
    } catch (e) {
        console.error(e.message)
        console.log(p.ACMGMyProfile_Id, getCertificationHistory(p))
    }
})

