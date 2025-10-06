/**
 * React Hooks for Planning Schema
 * 
 * Custom hooks to fetch and manage data from planning schema tables
 */

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { TABLES, PLANNING_TABLES } from './supabase'
import { 
  mapDBToProjects, 
  mapDBToBOQActivities,
  mapProjectToDB,
  mapBOQActivityToDB 
} from './planningSchemaAdapter'
import type { Project, BOQActivity, KPIRecord } from './supabase'

/**
 * Hook to fetch projects from Planning Database - ProjectsList
 */
export function usePlanningProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mappedProjects = mapDBToProjects(data || [])
      setProjects(mappedProjects)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return { projects, loading, error, refetch: fetchProjects }
}

/**
 * Hook to fetch BOQ activities from Planning Database - BOQ Rates
 */
export function usePlanningBOQActivities() {
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mappedActivities = mapDBToBOQActivities(data || [])
      setActivities(mappedActivities)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching BOQ activities:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return { activities, loading, error, refetch: fetchActivities }
}

/**
 * Hook to fetch KPI records from Planning Database - KPI
 */
export function usePlanningKPIs() {
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchKPIs = async () => {
    try {
      setLoading(true)
      setError('')
      
      // ✅ Use main KPI table to get both Planned & Actual
      const { data, error: fetchError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setKpis(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching KPIs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIs()
  }, [])

  return { kpis, loading, error, refetch: fetchKPIs }
}

/**
 * Helper functions for CRUD operations
 */
export const PlanningAPI = {
  // Projects
  projects: {
    async getAll() {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .select('*')
      if (error) throw error
      return mapDBToProjects(data || [])
    },
    
    async getByCode(code: string) {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .select('*')
        .eq('Project Code', code)
      if (error) throw error
      return mapDBToProjects(data || [])
    },
    
    async create(project: Partial<Project>) {
      const dbData = mapProjectToDB(project)
      const { data, error } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .insert(dbData)
        .select()
      if (error) throw error
      return data
    },
    
    async update(id: string, project: Partial<Project>) {
      const dbData = mapProjectToDB(project)
      const { data, error } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .update(dbData)
        .eq('id', id)
        .select()
      if (error) throw error
      return data
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  },

  // BOQ Activities
  boqActivities: {
    async getAll() {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .select('*')
      if (error) throw error
      return mapDBToBOQActivities(data || [])
    },
    
    async getByProjectCode(projectCode: string) {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .select('*')
        .eq('Project Code', projectCode)
      if (error) throw error
      return mapDBToBOQActivities(data || [])
    },
    
    async create(activity: Partial<BOQActivity>) {
      const dbData = mapBOQActivityToDB(activity)
      const { data, error } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .insert(dbData)
        .select()
      if (error) throw error
      return data
    },
    
    async update(id: string, activity: Partial<BOQActivity>) {
      const dbData = mapBOQActivityToDB(activity)
      const { data, error } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .update(dbData)
        .eq('id', id)
        .select()
      if (error) throw error
      return data
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  },

  // KPIs
  kpis: {
    async getAll() {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.KPI)
        .select('*')
      if (error) throw error
      return data || []
    },
    
    async getByProjectCode(projectCode: string) {
      const { data, error } = await supabase
        .from(PLANNING_TABLES.KPI)
        .select('*')
        .eq('Project Code', projectCode)
      if (error) throw error
      return data || []
    }
  }
}
