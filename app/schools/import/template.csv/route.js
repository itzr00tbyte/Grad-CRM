import { NextResponse } from 'next/server'

export async function GET() {
  const templateContent = 'name,city,state,board,segment,status,notes\n"Example School","Bangalore","Karnataka","cbse","k12","lead","Initial import"'
  
  const headers = new Headers()
  headers.set('Content-Type', 'text/csv')
  headers.set('Content-Disposition', 'attachment; filename="leads_template.csv"')
  
  return new NextResponse(templateContent, { headers })
}
