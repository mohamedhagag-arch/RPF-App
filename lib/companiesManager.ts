/**
 * Companies Manager
 * Manages CRUD operations for Companies (Clients, Consultants, Contractors, First Parties, Individuals)
 */

import { getSupabaseClient } from './simpleConnectionManager'

export interface Company {
  id: string
  company_name: string
  company_type: 'Client' | 'Consultant' | 'Contractor' | 'First Party' | 'Individual'
  created_at?: string
  updated_at?: string
  created_by?: string
}

/**
 * Initialize the companies table (check if it exists)
 */
export async function initializeCompaniesTable(): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('Planning Database - Companies')
      .select('id')
      .limit(1)
    
    // If error and it's not a "table doesn't exist" error, log it but don't throw
    // This is just a check function, we'll handle errors in actual operations
    if (error) {
      if (error.message.includes('does not exist')) {
        console.warn('⚠️ Companies table does not exist. Please run the SQL script to create it.')
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.warn('⚠️ Permission denied. Please check RLS policies in Supabase.')
      } else {
        console.warn('⚠️ Companies table check:', error.message)
      }
    }
  } catch (error: any) {
    console.warn('⚠️ Companies table initialization check:', error.message)
  }
}

/**
 * Get all companies, optionally filtered by type
 */
export async function getAllCompanies(type?: Company['company_type']): Promise<Company[]> {
  try {
    const supabase = getSupabaseClient()
    
    // Use type casting for table with spaces
    const supabaseClient = supabase as any
    let query = supabaseClient
      .from('Planning Database - Companies')
      .select('*')
      .order('Company Name', { ascending: true })
    
    if (type) {
      query = query.eq('Company Type', type)
    }
    
    const { data, error } = await query
    
    if (error) {
      // Provide more helpful error messages
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.error('❌ Permission denied. Please run the SQL script to fix RLS policies:')
        console.error('   Database/fix-companies-table-rls.sql or Database/create-companies-table-complete.sql')
        throw new Error('Permission denied. Please contact administrator or run the SQL script to fix RLS policies.')
      }
      console.error('Error fetching companies:', error)
      throw error
    }
    
    return ((data || []) as any[]).map((row: any) => ({
      id: row.id,
      company_name: row['Company Name'] || '',
      company_type: row['Company Type'] || 'Client',
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    }))
  } catch (error: any) {
    console.error('Error in getAllCompanies:', error)
    throw error
  }
}

/**
 * Get companies by type (convenience function)
 */
export async function getCompaniesByType(type: Company['company_type']): Promise<Company[]> {
  return getAllCompanies(type)
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('Planning Database - Companies')
      .select('*')
      .eq('id', id)
      .single() as any
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching company:', error)
      throw error
    }
    
    if (!data) return null
    
    return {
      id: data.id,
      company_name: data['Company Name'] || '',
      company_type: data['Company Type'] || 'Client',
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by
    }
  } catch (error: any) {
    console.error('Error in getCompanyById:', error)
    throw error
  }
}

/**
 * Add a new company
 */
export async function addCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Company> {
  try {
    const supabase = getSupabaseClient()
    
    // Check if company already exists
    const { data: existing } = await supabase
      .from('Planning Database - Companies')
      .select('id')
      .eq('Company Name', company.company_name)
      .eq('Company Type', company.company_type)
      .single()
    
    if (existing) {
      throw new Error(`Company "${company.company_name}" of type "${company.company_type}" already exists`)
    }
    
    const { data, error } = await supabase
      .from('Planning Database - Companies')
      .insert({
        'Company Name': company.company_name,
        'Company Type': company.company_type
      } as any)
      .select()
      .single() as any
    
    if (error) {
      console.error('Error adding company:', error)
      throw error
    }
    
    return {
      id: data.id,
      company_name: data['Company Name'] || '',
      company_type: data['Company Type'] || 'Client',
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by
    }
  } catch (error: any) {
    console.error('Error in addCompany:', error)
    throw error
  }
}

/**
 * Update an existing company
 */
export async function updateCompany(id: string, company: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<Company> {
  try {
    const supabase = getSupabaseClient()
    
    const updateData: any = {}
    if (company.company_name !== undefined) {
      updateData['Company Name'] = company.company_name
    }
    if (company.company_type !== undefined) {
      updateData['Company Type'] = company.company_type
    }
    
    // Check for duplicate if updating name or type
    if (company.company_name || company.company_type) {
      const current = await getCompanyById(id)
      if (current) {
        const newName = company.company_name || current.company_name
        const newType = company.company_type || current.company_type
        
        const { data: existing } = await supabase
          .from('Planning Database - Companies')
          .select('id')
          .eq('Company Name', newName)
          .eq('Company Type', newType)
          .neq('id', id)
          .single()
        
        if (existing) {
          throw new Error(`Company "${newName}" of type "${newType}" already exists`)
        }
      }
    }
    
    // Type casting needed due to table name with spaces
    const supabaseClient = supabase as any
    const { data, error } = await supabaseClient
      .from('Planning Database - Companies')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating company:', error)
      throw error
    }
    
    return {
      id: data.id,
      company_name: data['Company Name'] || '',
      company_type: data['Company Type'] || 'Client',
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by
    }
  } catch (error: any) {
    console.error('Error in updateCompany:', error)
    throw error
  }
}

/**
 * Delete a company
 */
export async function deleteCompany(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('Planning Database - Companies')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting company:', error)
      throw error
    }
  } catch (error: any) {
    console.error('Error in deleteCompany:', error)
    throw error
  }
}

/**
 * Import companies from CSV data
 */
export async function importCompanies(companies: Array<{ company_name: string; company_type: Company['company_type'] }>): Promise<{ success: number; errors: number }> {
  let success = 0
  let errors = 0
  
  for (const company of companies) {
    try {
      // Check if company already exists
      const existing = await getAllCompanies()
      const duplicate = existing.find(
        c => c.company_name.toLowerCase() === company.company_name.toLowerCase() &&
        c.company_type === company.company_type
      )
      
      if (!duplicate) {
        await addCompany(company)
        success++
      } else {
        errors++ // Count as error (duplicate)
      }
    } catch (error: any) {
      console.warn(`Failed to import company "${company.company_name}":`, error.message)
      errors++
    }
  }
  
  return { success, errors }
}

