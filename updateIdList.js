import { workbookToJSON } from "./util/excel.js";

const book = workbookToJSON('/Users/mm/Downloads/recent_updates.xlsx')

console.log(book.ACMGMyProfile.map(e => e['#']).join(','))