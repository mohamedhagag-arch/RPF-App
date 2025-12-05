'use client'
import MachineList from '@/components/cost-control/MachineList'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function MachineListPage() {
  return (
    <PermissionPage 
      permission="cost_control.machine_list.view"
      accessDeniedTitle="Machine List Access Required"
      accessDeniedMessage="You need permission to view machine list. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Machine List" />
      <MachineList />
    </PermissionPage>
  )
}

