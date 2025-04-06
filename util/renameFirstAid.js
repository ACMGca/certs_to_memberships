'use strict';

// import { rename, readdir } from "node:fs/promises";

// // RENAME Routine (if needed later)
// const root = 'public/files/memberFiles/first aid/'
// // read all the files in the current directory
// const files = await readdir(root);

// const needRename = files.filter(f => f.includes('-1.'))
// console.log(needRename)

// needRename.forEach(async (f, index) => {

//     const nameParts = f.split('.')
//     const newName = nameParts[0].substring(0, nameParts[0].length - 2) + '.' + nameParts[1]
//     await rename(`${root}${f}`, `${root}${newName}`)
// })

const proc = Bun.spawnSync(['echo', 'hello'])

console.log(proc)