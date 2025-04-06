'use strict';

import { rename, readdir } from "node:fs/promises";
import { jsonToWorkbookOnDisk } from "./excel.js";

export const buildMemberFilesMetadata = async () => {

    const photosFolder = 'member photos'
    const firstaidFolder = 'first aid'

    const photoFilesPath = `public/files/memberFiles/${photosFolder}/`
    const firstAidFilesPath = `public/files/memberFiles/${firstaidFolder}/`

    const data = {
        [photosFolder]: [],
        [firstaidFolder]: []
    }

    const photoFiles = await readdir(photoFilesPath);
    const firstaidFiles = await readdir(firstAidFilesPath);

    function sortFileNames(a, b) {

        let aNum = Number(a.split('.')[0].replace('-2', ''))
        let bNum = Number(b.split('.')[0].replace('-2', ''))

        if (aNum < bNum) {
            return -1;
        } else if (aNum > bNum) {
            return 1;
        }

        // they are equal - so use the presence of -2 to decide
        if (b.includes('-2')) {
            return -1
        } else if (a.includes('-2')) {
            return 1
        }
        return 0;
    }

    photoFiles.sort(sortFileNames)
    firstaidFiles.sort(sortFileNames)

    photoFiles.forEach((p) => {

        data[photosFolder].push({ fileName: p })
    })

    firstaidFiles.forEach((f) => {

        data[firstaidFolder].push({ fileName: f })
    })

    // Write the files metadata Excel Workbook: 
    jsonToWorkbookOnDisk(data, './public/data/ACMG_Member_Files_Metadata.xlsx')
}