// Script to thoroughly clean and filter InboxTales_School_Contacts_MASTER.csv
// Backs up original to InboxTales_School_Contacts_MASTER.csv.bak before writing.

import fs from 'node:fs'
import { parse } from 'csv-parse/sync'

const csvPath = '/Users/snehithchalasani/Stuff/SchoolGrads-CRM/InboxTales_School_Contacts_MASTER.csv'
const backupPath = '/Users/snehithchalasani/Stuff/SchoolGrads-CRM/InboxTales_School_Contacts_MASTER.csv.bak'

if (!fs.existsSync(csvPath)) {
  console.error('File not found:', csvPath)
  process.exit(1)
}

// 1. Backup original
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(csvPath, backupPath)
  console.log(`✓ Backup saved to: ${backupPath}`)
}

const fileContent = fs.readFileSync(backupPath, 'utf8') // read from backup for clean idempotence
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
  relax_column_count: true
})

console.log(`Processing ${records.length} records...`)

// State normalizer
const STATE_MAP = {
  'up': 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'uttar presh': 'Uttar Pradesh',
  'uttar predash': 'Uttar Pradesh',
  'u.p': 'Uttar Pradesh',
  'u.p.': 'Uttar Pradesh',
  'ts': 'Telangana',
  'telangana': 'Telangana',
  'telegana': 'Telangana',
  'telengana': 'Telangana',
  'ap': 'Andhra Pradesh',
  'andhra pradesh': 'Andhra Pradesh',
  'andhra': 'Andhra Pradesh',
  'gujarat': 'Gujarat',
  'gujrat': 'Gujarat',
  'maharashtra': 'Maharashtra',
  'maharastra': 'Maharashtra',
  'mh': 'Maharashtra',
  'karnataka': 'Karnataka',
  'kar': 'Karnataka',
  'ka': 'Karnataka',
  'kerala': 'Kerala',
  'thiruvananthapuram': 'Kerala',
  '683501': 'Kerala',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'tn': 'Tamil Nadu',
  'rajasthan': 'Rajasthan',
  'rajastan': 'Rajasthan',
  'raj': 'Rajasthan',
  'haryana': 'Haryana',
  'hariyana': 'Haryana',
  'hr': 'Haryana',
  'madhya pradesh': 'Madhya Pradesh',
  'mp': 'Madhya Pradesh',
  'west bengal': 'West Bengal',
  'wb': 'West Bengal',
  'delhi': 'Delhi NCR',
  'new delhi': 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  'punjab': 'Punjab',
  'pb': 'Punjab',
  'chhattisgarh': 'Chhattisgarh',
  'chattisgarh': 'Chhattisgarh',
  'cg': 'Chhattisgarh',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'goa': 'Goa',
  'assam': 'Assam',
  'bihar': 'Bihar',
  'jharkhand': 'Jharkhand',
  'uttarakhand': 'Uttarakhand',
  'himachal pradesh': 'Himachal Pradesh',
}

const STATE_NAMES_LIST = Object.values(STATE_MAP)

// City normalizer
const CITY_MAP = {
  'ahemdabaad': 'Ahmedabad',
  'ahmedabad': 'Ahmedabad',
  'aburoad': 'Abu Road',
  'abu road': 'Abu Road',
  'bangalore': 'Bengaluru',
  'banglore': 'Bengaluru',
  'bengaluru': 'Bengaluru',
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'navi mumbai': 'Navi Mumbai',
  'hyderabad': 'Hyderabad',
  'hyd': 'Hyderabad',
  'secunderabad': 'Hyderabad',
  'chennai': 'Chennai',
  'madras': 'Chennai',
  'kolkata': 'Kolkata',
  'calcutta': 'Kolkata',
  'new delhi': 'New Delhi',
  'delhi': 'Delhi',
  'pune': 'Pune',
  'jaipur': 'Jaipur',
  'indore': 'Indore',
  'bhopal': 'Bhopal',
  'lucknow': 'Lucknow',
  'kanpur': 'Kanpur',
  'agra': 'Agra',
  'varanasi': 'Varanasi',
  'noida': 'Noida',
  'greater noida': 'Greater Noida',
  'ghaziabad': 'Ghaziabad',
  'faridabad': 'Faridabad',
  'coimbatore': 'Coimbatore',
  'kochi': 'Kochi',
  'cochin': 'Kochi',
  'trivandrum': 'Thiruvananthapuram',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'chandigarh': 'Chandigarh',
  'mohali': 'Mohali',
  'panchkula': 'Panchkula',
  'surat': 'Surat',
  'vadodara': 'Vadodara',
  'baroda': 'Vadodara',
  'rajkot': 'Rajkot',
  'nagpur': 'Nagpur',
  'nashik': 'Nashik',
  'aurangabad': 'Chhatrapati Sambhajinagar (Aurangabad)',
  'patna': 'Patna',
  'ranchi': 'Ranchi',
  'bhubaneswar': 'Bhubaneswar',
  'raipur': 'Raipur',
  'dehradun': 'Dehradun',
  'mysore': 'Mysuru',
  'mysuru': 'Mysuru',
  'mangalore': 'Mangaluru',
  'mangaluru': 'Mangaluru',
  'visakhapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam',
  'vijayawada': 'Vijayawada',
  'guntur': 'Guntur',
  'panipat': 'Panipat',
  'jabalpur': 'Jabalpur',
  'guna': 'Guna',
  'betul': 'Betul',
  'ballarpur': 'Ballarpur',
  'pilani': 'Pilani',
  'baghpat': 'Baghpat',
  'gorakhpur': 'Gorakhpur',
  'ballia': 'Ballia',
  'meerut': 'Meerut'
}

// Known cities for extraction
const KNOWN_CITIES = Object.values(CITY_MAP)

// Designation standardizer
function cleanDesignation(d) {
  if (!d) return ''
  let val = d.trim()
  const lower = val.toLowerCase()
  if (lower.includes('principal') && !lower.includes('vice')) return 'Principal'
  if (lower.includes('vice principal') || lower.includes('vice-principal') || lower.includes('vp')) return 'Vice Principal'
  if (lower.includes('director')) return 'Director'
  if (lower.includes('founder') || lower.includes('chairman') || lower.includes('trustee') || lower.includes('president') || lower.includes('chancellor') || lower.includes('managing')) return 'Founder / Trustee'
  if (lower.includes('head') || lower.includes('coordinator') || lower.includes('incharge') || lower.includes('in-charge')) return 'Coordinator / Academic Head'
  if (lower.includes('teacher') || lower.includes('educator') || lower.includes('faculty')) return 'Teacher'
  if (lower.includes('account') || lower.includes('finance') || lower.includes('admin') || lower.includes('manager')) return 'Accounts / Admin'
  return val.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
}

// Clean Phone
function cleanPhone(p) {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return digits
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) return digits.slice(1)
  if (digits.length > 10) {
    const parts = p.split(/[/,;\s]+/).map(s => s.replace(/\D/g, '')).filter(s => s.length >= 10)
    if (parts.length > 0) {
      const first = parts[0].slice(-10)
      if (/^[6-9]\d{9}$/.test(first)) return first
    }
  }
  return digits.length >= 10 ? digits.slice(-10) : ''
}

// Clean Email
function cleanEmail(e) {
  if (!e) return ''
  let email = e.trim().toLowerCase().replace(/^[,\s;]+|[,\s;.]+$/g, '')
  email = email.replace('@gamil.com', '@gmail.com')
               .replace('@gmal.com', '@gmail.com')
               .replace('@yaho.com', '@yahoo.com')
               .replace('@outlok.com', '@outlook.com')
               .replace('@rediff.com', '@rediffmail.com')
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email
  return ''
}

// Clean Name
function cleanName(n) {
  if (!n) return ''
  let str = n.trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, ' ')
  if (str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return ''
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

// Clean School Name
function cleanSchoolName(s, contactName) {
  if (!s) return ''
  let str = s.trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_/]+$/, '')

  if (str === '---' || str === 'NA' || str === 'Nil' || str === 'None' || str.length < 3) {
    if (contactName && contactName.length >= 3 && !/^(mr|ms|mrs|dr|fr)\.?\s/i.test(contactName)) {
      return contactName
    }
    return ''
  }
  return str
}

// Clean Board
function cleanBoard(b) {
  if (!b) return ''
  const str = b.trim().toUpperCase()
  if (str.includes('@') || /\d{5,}/.test(str)) return '' // shifted column (email or phone)
  if (str.includes('CBSE')) return 'CBSE'
  if (str.includes('ICSE') || str.includes('ISC')) return 'ICSE'
  if (str.includes('IGCSE') || str.includes('CAMBRIDG') || str.includes('CAMBRIDGE')) return 'IGCSE / Cambridge'
  if (str.includes('IB') || str.includes('INTERNATIONAL BACCALAUREATE')) return 'IB'
  if (str.includes('STATE') || str.includes('SSC') || str.includes('HSC')) return 'State'
  if (str.includes('PRE') || str.includes('MONTESSORI') || str.includes('KINDERGARTEN')) return 'Preschool'
  return b.trim()
}

// Helper to escape CSV fields
function csvEscape(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Extract city from school name or address if city is missing / is a state
function extractCityFromText(text) {
  if (!text) return null
  for (const c of KNOWN_CITIES) {
    const regex = new RegExp(`\\b${c}\\b`, 'i')
    if (regex.test(text)) return c
  }
  return null
}

const cleanedRecords = []
const seenRecords = new Set()

let droppedCount = 0
let cleanedCount = 0

for (const row of records) {
  const rawContact = row['Name'] || ''
  const rawSchool = row['School / Institute'] || ''
  const rawDesignation = row['Designation'] || ''
  let rawCity = (row['City'] || '').trim()
  let rawRegion = (row['Region'] || '').trim()
  let rawState = (row['State'] || '').trim()
  const rawEmail = row['Email'] || ''
  const rawMobile = row['Mobile'] || ''
  const rawAltMobile = row['Alt Mobile'] || ''
  const rawBoard = row['Board'] || ''
  const rawStrength = row['Student Strength'] || ''
  const rawGrade = row['Grade Taught'] || ''
  const rawAddress = row['Address'] || ''
  const rawWebsite = row['Website'] || ''
  const rawStatus = row['Status / Notes'] || ''
  const rawDate = row['Date Added'] || ''
  const rawSource = row['Source Tab'] || ''

  let name = cleanName(rawContact)
  let school = cleanSchoolName(rawSchool, rawContact)
  let designation = cleanDesignation(rawDesignation)

  // Detect swapped name & school (e.g. Name='Senior Secondary Head The Green School', School='Priyanki Debroy')
  if (
    school &&
    /^(Mr\.|Ms\.|Mrs\.|Dr\.|Fr\.)?\s*[A-Z][a-z]+\s+[A-Z][a-z]+$/i.test(school) &&
    name &&
    /\b(School|Academy|College|Institute|Vidya|Campus|Trust)\b/i.test(name)
  ) {
    const tempContact = school
    let tempSchool = name
    // Check if designation is embedded in school string (e.g. "Senior Secondary Head The Green School")
    if (/^(Senior Secondary Head|Head|Principal|Director)\s+/i.test(tempSchool)) {
      const match = tempSchool.match(/^(Senior Secondary Head|Head|Principal|Director)\s+(.*)$/i)
      if (match) {
        designation = cleanDesignation(match[1])
        tempSchool = match[2]
      }
    }
    school = cleanSchoolName(tempSchool)
    name = cleanName(tempContact)
  }

  // Check if City field actually holds a state name (e.g. City='Haryana')
  let cityKey = rawCity.toLowerCase()
  let stateKey = rawState.toLowerCase()

  let state = STATE_MAP[stateKey] || (STATE_MAP[cityKey] ? STATE_MAP[cityKey] : cleanName(rawState))
  let city = CITY_MAP[cityKey] || cleanName(rawCity)

  // If city was mapped to a state, clear city and try to extract from school/address
  if (STATE_MAP[cityKey]) {
    const extracted = extractCityFromText(school) || extractCityFromText(rawAddress) || extractCityFromText(rawRegion)
    city = extracted || ''
  }

  // Normalize Region
  const regionKey = rawRegion.toLowerCase()
  const region = CITY_MAP[regionKey] || (STATE_MAP[regionKey] ? '' : cleanName(rawRegion))

  // If state is still empty but city is known, infer state
  if (!state && city) {
    if (['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'].includes(city)) state = 'Gujarat'
    else if (['Mumbai', 'Pune', 'Navi Mumbai', 'Nagpur', 'Nashik', 'Ballarpur', 'Chhatrapati Sambhajinagar (Aurangabad)'].includes(city)) state = 'Maharashtra'
    else if (['Bengaluru', 'Mysuru', 'Mangaluru'].includes(city)) state = 'Karnataka'
    else if (['Hyderabad'].includes(city)) state = 'Telangana'
    else if (['Delhi', 'New Delhi'].includes(city)) state = 'Delhi NCR'
    else if (['Chennai', 'Coimbatore'].includes(city)) state = 'Tamil Nadu'
    else if (['Jaipur', 'Abu Road', 'Jodhpur', 'Udaipur', 'Pilani'].includes(city)) state = 'Rajasthan'
    else if (['Kochi', 'Thiruvananthapuram', 'Kozhikode'].includes(city)) state = 'Kerala'
    else if (['Gurugram', 'Faridabad', 'Panchkula', 'Panipat'].includes(city)) state = 'Haryana'
    else if (['Noida', 'Greater Noida', 'Ghaziabad', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Gorakhpur', 'Baghpat', 'Ballia', 'Meerut'].includes(city)) state = 'Uttar Pradesh'
    else if (['Kolkata'].includes(city)) state = 'West Bengal'
    else if (['Indore', 'Bhopal', 'Jabalpur', 'Guna', 'Betul'].includes(city)) state = 'Madhya Pradesh'
    else if (['Chandigarh', 'Mohali'].includes(city)) state = 'Punjab'
  }

  let email = cleanEmail(rawEmail)
  let mobile = cleanPhone(rawMobile)
  let altMobile = cleanPhone(rawAltMobile)

  // Rescue emails/phones shifted into Board column
  if (!email && rawBoard.includes('@')) {
    email = cleanEmail(rawBoard)
  } else if (!mobile && /\d{5,}/.test(rawBoard)) {
    mobile = cleanPhone(rawBoard)
  }

  const board = cleanBoard(rawBoard)

  // Drop rows that have neither school name nor contact name, or have 0 contact info
  if (!school && !name) {
    droppedCount++
    continue
  }
  if (!school && !mobile && !email) {
    droppedCount++
    continue
  }

  // Deduplicate exact duplicate contacts
  const dedupeKey = `${(school || '').toLowerCase()}::${email || ''}::${mobile || ''}::${(name || '').toLowerCase()}`
  if (seenRecords.has(dedupeKey)) {
    droppedCount++
    continue
  }
  seenRecords.add(dedupeKey)

  cleanedRecords.push({
    'Name': name,
    'Designation': designation,
    'School / Institute': school || name,
    'City': city,
    'Region': region,
    'State': state,
    'Email': email,
    'Mobile': mobile,
    'Alt Mobile': altMobile,
    'Board': board,
    'Student Strength': rawStrength.trim(),
    'Grade Taught': rawGrade.trim(),
    'Address': rawAddress.trim().replace(/\s+/g, ' '),
    'Website': rawWebsite.trim().toLowerCase(),
    'Status / Notes': rawStatus.trim(),
    'Date Added': rawDate.trim(),
    'Source Tab': rawSource.trim()
  })

  cleanedCount++
}

// Write out clean CSV
const headers = [
  'Name', 'Designation', 'School / Institute', 'City', 'Region', 'State',
  'Email', 'Mobile', 'Alt Mobile', 'Board', 'Student Strength', 'Grade Taught',
  'Address', 'Website', 'Status / Notes', 'Date Added', 'Source Tab'
]

const csvOutput = [
  headers.join(','),
  ...cleanedRecords.map(r => headers.map(h => csvEscape(r[h])).join(','))
].join('\n')

fs.writeFileSync(csvPath, csvOutput, 'utf8')

console.log(`\n🎉 CSV Cleaning Complete!`)
console.log(`  - Original rows: ${records.length}`)
console.log(`  - Cleaned & filtered rows: ${cleanedRecords.length}`)
console.log(`  - Duplicates / invalid rows removed: ${droppedCount}`)
console.log(`  - Output: ${csvPath}`)
