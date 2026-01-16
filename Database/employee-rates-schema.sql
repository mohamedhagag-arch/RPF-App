-- =====================================================
-- Employee Rates Table Schema
-- جدول معدلات العمال - Rate لكل عامل بشكل فردي
-- =====================================================
-- This table stores hourly rates for individual employees
-- Each employee has their own rate instead of using designation rates
-- Created: 2025-01-XX
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: Create employee_rates table
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_manpower(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL, -- Denormalized for easier queries
  employee_name TEXT NOT NULL, -- Denormalized for easier queries
  designation TEXT, -- Denormalized for easier queries (from hr_manpower)
  hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  overtime_hourly_rate DECIMAL(10, 2) CHECK (overtime_hourly_rate >= 0),
  off_day_hourly_rate DECIMAL(10, 2) CHECK (off_day_hourly_rate >= 0),
  overhead_hourly_rate DECIMAL(10, 2) DEFAULT 5.3 CHECK (overhead_hourly_rate >= 0),
  total_hourly_rate DECIMAL(10, 2) GENERATED ALWAYS AS (hourly_rate + COALESCE(overhead_hourly_rate, 5.3)) STORED,
  daily_rate DECIMAL(10, 2) GENERATED ALWAYS AS ((hourly_rate + COALESCE(overhead_hourly_rate, 5.3)) * 8) STORED,
  authority TEXT DEFAULT 'General Authority',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_employee_rate UNIQUE (employee_id) -- One rate per employee
);

-- =====================================================
-- STEP 2: Create Indexes for Better Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_rates_employee_id ON employee_rates(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_rates_employee_code ON employee_rates(employee_code);
CREATE INDEX IF NOT EXISTS idx_employee_rates_employee_name ON employee_rates(employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_rates_designation ON employee_rates(designation);
CREATE INDEX IF NOT EXISTS idx_employee_rates_authority ON employee_rates(authority);
CREATE INDEX IF NOT EXISTS idx_employee_rates_created_by ON employee_rates(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_rates_updated_by ON employee_rates(updated_by);

-- =====================================================
-- STEP 3: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE employee_rates IS 'Stores hourly rates for individual employees (each employee has their own rate)';
COMMENT ON COLUMN employee_rates.employee_id IS 'Reference to hr_manpower table';
COMMENT ON COLUMN employee_rates.employee_code IS 'Employee code (denormalized for easier queries)';
COMMENT ON COLUMN employee_rates.employee_name IS 'Employee name (denormalized for easier queries)';
COMMENT ON COLUMN employee_rates.designation IS 'Job designation (denormalized for easier queries)';
COMMENT ON COLUMN employee_rates.hourly_rate IS 'Standard hourly rate for this employee';
COMMENT ON COLUMN employee_rates.overtime_hourly_rate IS 'Hourly rate for overtime work';
COMMENT ON COLUMN employee_rates.off_day_hourly_rate IS 'Hourly rate for work on off days';
COMMENT ON COLUMN employee_rates.overhead_hourly_rate IS 'Overhead hourly rate (default: 5.3)';
COMMENT ON COLUMN employee_rates.total_hourly_rate IS 'Auto-calculated: hourly_rate + overhead_hourly_rate';
COMMENT ON COLUMN employee_rates.daily_rate IS 'Auto-calculated: total_hourly_rate * 8';
COMMENT ON COLUMN employee_rates.authority IS 'Authority or organization name';

-- =====================================================
-- STEP 4: Create Trigger to Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_employee_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_employee_rates_updated_at ON employee_rates;
CREATE TRIGGER trigger_update_employee_rates_updated_at
  BEFORE UPDATE ON employee_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_rates_updated_at();

-- =====================================================
-- STEP 5: Create Function to Sync Employee Data
-- =====================================================
-- This function updates denormalized fields when hr_manpower changes

CREATE OR REPLACE FUNCTION sync_employee_rates_from_hr_manpower()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee_rates when hr_manpower is updated
  UPDATE employee_rates
  SET 
    employee_code = NEW.employee_code,
    employee_name = NEW.employee_name,
    designation = NEW.designation,
    updated_at = NOW()
  WHERE employee_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on hr_manpower to sync employee_rates
DROP TRIGGER IF EXISTS trigger_sync_employee_rates ON hr_manpower;
CREATE TRIGGER trigger_sync_employee_rates
  AFTER UPDATE OF employee_code, employee_name, designation ON hr_manpower
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_rates_from_hr_manpower();

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Employee Rates table created successfully!';
  RAISE NOTICE '📋 Table: employee_rates';
  RAISE NOTICE '🔗 Linked to: hr_manpower';
  RAISE NOTICE '📊 Features: Individual rates per employee';
END $$;
