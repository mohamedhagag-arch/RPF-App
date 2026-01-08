# Contract Variations Table - Setup Guide

## Overview
This document describes the Contract Variations table created for the Commercial section. The table stores contract variations with project details, BOQ item references, quantities, amounts, and approval status.

## Database Schema

### Table Name
`Contract Variations`

### Key Features
- ✅ Auto-generated unique reference numbers in format `VAR-YYYY-XXX` (e.g., `VAR-2024-001`)
- ✅ Automatic Project Name population from ProjectsList table
- ✅ Array of BOQ item UUIDs for referencing multiple items
- ✅ Enum constraint for Variation Status
- ✅ User tracking (created_by, updated_by)
- ✅ Automatic timestamp management

### Columns

| Column Name | Type | Description | Constraints |
|------------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `Auto Generated Unique Reference Number` | TEXT | Unique reference (VAR-YYYY-XXX) | NOT NULL, UNIQUE, Auto-generated |
| `Project Full Code` | TEXT | References Project Sub-Code from ProjectsList | NOT NULL |
| `Project Name` | TEXT | Auto-populated from ProjectsList | NOT NULL |
| `Variation Ref no.` | TEXT | Variation reference number | Nullable |
| `Item Description` | UUID[] | Array of BOQ item UUIDs | Default: empty array |
| `Quantity Changes` | NUMERIC(15, 2) | Quantity changes | Default: 0.00 |
| `Variation Amount` | NUMERIC(15, 2) | Variation amount in currency | Default: 0.00 |
| `Date of Submission` | DATE | Date of submission | Nullable |
| `Variation Status` | variation_status | Status enum | Default: 'Pending' |
| `Date of Approval` | DATE | Date of approval | Nullable |
| `Remarks` | TEXT | Additional remarks | Nullable |
| `created_at` | TIMESTAMP WITH TIME ZONE | Creation timestamp | Auto-generated |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Last update timestamp | Auto-updated |
| `created_by` | UUID | User who created the record | FK to users.id, Nullable |
| `updated_by` | UUID | User who last updated the record | FK to users.id, Nullable |

### Variation Status Enum Values
- `Pending`
- `Var Notice Sent`
- `Submitted`
- `Approved`
- `Rejected`
- `Internal Variation`

## Installation

### Step 1: Run the SQL Script
1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `Database/contract-variations-schema.sql`
5. Click **RUN** or press `Ctrl+Enter`
6. Verify success messages in the output

### Step 2: Verify Table Creation
1. Go to **Table Editor** in Supabase
2. Look for the `Contract Variations` table
3. Verify all columns are present
4. Check that the enum type `variation_status` was created

### Step 3: Test Auto-Generation
1. Insert a test record (you can use the Table Editor or SQL):
```sql
INSERT INTO public."Contract Variations" (
  "Project Full Code",
  "Variation Ref no.",
  "Item Description",
  "Quantity Changes",
  "Variation Amount",
  "Variation Status"
) VALUES (
  'P5066-R4',  -- Replace with actual Project Sub-Code
  'VAR-REF-001',
  ARRAY[]::UUID[],  -- Empty array or array of BOQ item UUIDs
  10.50,
  5000.00,
  'Pending'
);
```

2. Verify that:
   - `Auto Generated Unique Reference Number` was auto-generated (format: VAR-YYYY-XXX)
   - `Project Name` was auto-populated from ProjectsList
   - `created_at` and `updated_at` were set

## TypeScript Integration

### Type Definitions
The TypeScript types are already added to `lib/supabase.ts`:

```typescript
export type VariationStatus = 
  | 'Pending'
  | 'Var Notice Sent'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Internal Variation'

export interface ContractVariation {
  id: string
  auto_generated_unique_reference_number: string
  project_full_code: string
  project_name: string
  variation_ref_no?: string
  item_description: string[] // Array of BOQ item UUIDs
  quantity_changes: number
  variation_amount: number
  date_of_submission?: string
  variation_status: VariationStatus
  date_of_approval?: string
  remarks?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}
```

### Table Constant
The table name is available in the `TABLES` constant:
```typescript
import { TABLES } from '@/lib/supabase'

const tableName = TABLES.CONTRACT_VARIATIONS // 'Contract Variations'
```

## Database Functions and Triggers

### 1. `generate_contract_variation_ref()`
- **Purpose**: Auto-generates unique reference numbers
- **Format**: `VAR-YYYY-XXX` (e.g., `VAR-2024-001`)
- **Trigger**: Fires before INSERT

### 2. `populate_project_name_from_code()`
- **Purpose**: Auto-populates Project Name from Project Full Code
- **Source**: `Planning Database - ProjectsList` table
- **Trigger**: Fires before INSERT or UPDATE

### 3. `update_updated_at_column()`
- **Purpose**: Updates the `updated_at` timestamp
- **Trigger**: Fires before UPDATE

## Indexes

The following indexes are created for performance:

1. `idx_contract_variations_ref_number` - On reference number (for lookups)
2. `idx_contract_variations_project_full_code` - On project full code (for filtering)
3. `idx_contract_variations_project_name` - On project name (for filtering)
4. `idx_contract_variations_status` - On variation status (for filtering)
5. `idx_contract_variations_created_at` - On created_at DESC (for sorting)
6. `idx_contract_variations_created_by` - On created_by (for user filtering)
7. `idx_contract_variations_item_description` - GIN index on UUID array (for array queries)

## Row Level Security (RLS)

- **Status**: Enabled
- **Policy**: `auth_all_contract_variations`
- **Access**: All authenticated users have full access (SELECT, INSERT, UPDATE, DELETE)

## Relationships

### Foreign Keys
- `created_by` → `public.users(id)` (ON DELETE SET NULL)
- `updated_by` → `public.users(id)` (ON DELETE SET NULL)

### References (No FK constraints, but logical relationships)
- `Project Full Code` → `Planning Database - ProjectsList`.`Project Sub-Code`
- `Item Description` (UUID[]) → `BOQ items`.`id` (array of references)

## Usage Examples

### Fetching Variations
```typescript
import { getSupabaseClient, TABLES } from '@/lib/supabase'
import { ContractVariation } from '@/lib/supabase'

const supabase = getSupabaseClient()
const { data, error } = await supabase
  .from(TABLES.CONTRACT_VARIATIONS)
  .select('*')
  .order('created_at', { ascending: false })
```

### Creating a Variation
```typescript
const newVariation = {
  "Project Full Code": "P5066-R4",
  "Variation Ref no.": "VAR-REF-001",
  "Item Description": [boqItemId1, boqItemId2], // Array of UUIDs
  "Quantity Changes": 10.50,
  "Variation Amount": 5000.00,
  "Variation Status": "Pending" as VariationStatus,
  "Remarks": "Additional work required"
}

const { data, error } = await supabase
  .from(TABLES.CONTRACT_VARIATIONS)
  .insert(newVariation)
  .select()
```

### Updating Variation Status
```typescript
const { data, error } = await supabase
  .from(TABLES.CONTRACT_VARIATIONS)
  .update({
    "Variation Status": "Approved",
    "Date of Approval": new Date().toISOString().split('T')[0],
    "updated_by": currentUserId
  })
  .eq('id', variationId)
```

## Notes

1. **Project Name Auto-Population**: The Project Name is automatically populated from the ProjectsList table based on the Project Full Code. If no matching project is found, it will be set to an empty string (to satisfy NOT NULL constraint).

2. **BOQ Item References**: The `Item Description` column stores an array of UUIDs referencing BOQ items. To display the actual item descriptions, you'll need to join with the `BOQ items` table.

3. **Reference Number Format**: The auto-generated reference number uses the format `VAR-YYYY-XXX` where:
   - `VAR` is the prefix
   - `YYYY` is the current year
   - `XXX` is a zero-padded sequence number (001, 002, etc.)

4. **Date Fields**: Both `Date of Submission` and `Date of Approval` are nullable, as they may not be set at the time of creation.

5. **User Tracking**: The `created_by` and `updated_by` fields should be populated by your application when creating or updating records.

## Troubleshooting

### Issue: Reference number not auto-generating
**Solution**: Check that the trigger `trigger_generate_contract_variation_ref` exists and is enabled.

### Issue: Project Name not auto-populating
**Solution**: 
1. Verify that the Project Full Code matches a Project Sub-Code in the ProjectsList table
2. Check that the trigger `trigger_populate_project_name` exists and is enabled

### Issue: Cannot insert into array column
**Solution**: Use PostgreSQL array syntax: `ARRAY['uuid1', 'uuid2']::UUID[]` or in TypeScript, pass a regular array and Supabase will handle the conversion.

## Next Steps

1. ✅ Database table created
2. ✅ TypeScript types added
3. ⏭️ Create UI component for managing variations (similar to CommercialBOQItemsManagement)
4. ⏭️ Add form for creating/editing variations
5. ⏭️ Add filtering and search functionality
6. ⏭️ Add approval workflow UI

