'use strict';

const XLSX = require("xlsx");

export const workbookToJSON = (workbookFilePath) => {

    const workbook = XLSX.readFile(workbookFilePath, { type: 'binary', cellText: false, cellDates: true })

    return workbook.SheetNames.reduce((acc, sheetName) => {

        acc[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 0, defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
        return acc
    }, {})
}

export const jsonFileToWorkbook = async (jsonFilePath) => {

    const jsonFile = Bun.file(jsonFilePath)
    const json = await jsonFile.json()

    const workbook = XLSX.utils.book_new();
    const sheets = Object.values(json)

    Object.keys(json).forEach((sheetName, index) => {

        const worksheet = XLSX.utils.json_to_sheet(sheets[index])
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    return workbook
}

export const jsonToWorkbookOnDisk = async (jsonData, workbookPath) => {

    const workbook = XLSX.utils.book_new();
    const sheets = Object.values(jsonData)

    Object.keys(jsonData).forEach((sheetName, index) => {

        const worksheet = XLSX.utils.json_to_sheet(sheets[index])
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    XLSX.writeFile(workbook, workbookPath, { compression: true });
}

const workbookJSON = workbookToJSON('/Users/mm/Downloads/wicket-person-import-test (3).xlsx')

jsonToWorkbookOnDisk(workbookJSON, './newWorkbook.xlsx')

// console.log(book)