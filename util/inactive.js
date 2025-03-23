import { workbookToJSON } from "./excel.js";
import { getCertificationHistory, CERTKEYLIST } from "./helpers.js";
import { parseISO, format } from "date-fns";

const workbookFilePath = './public/data/legacy-inactives.xlsx'

const data = workbookToJSON(workbookFilePath)



console.log(`num,status,inactiveDate,currentInactiveDate, dateEnd`)
data['ACMGMyProfile'].forEach((row, index) => {

    const inactiveDate = row.LegacyInactiveDate.length > 0 ? row.LegacyInactiveDate : 'no-LegacyInactiveDate'
    const currentInactiveDate = row.LegacyCurrentInactiveDate.length > 0 ? row.LegacyCurrentInactiveDate : 'no-LegacyCurrentInactiveDate'
    const dateResigned = (row['Date Resigned'] && row['Date Resigned'].length > 0) ? row['Date Resigned'] : 'no-DateResigned'
    console.log(`${index + 1},${row.Status},${inactiveDate},${currentInactiveDate},${dateResigned}`)
})

// console.log(data['ACMGMyProfile'][0])