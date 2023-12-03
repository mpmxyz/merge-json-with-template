import * as fs from 'fs'

//redirecting fs to allow mocking with jest
export const readFileSync = fs.readFileSync
export const writeFileSync = fs.writeFileSync
export const existsSync = fs.existsSync
