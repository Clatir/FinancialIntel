import { Badge } from '../../components/ui'

/**
 * The mark of a panel of this computer's settings (AP-28, US.1): config.json in the user data, never the folder on
 * OneDrive – another computer has its own. One mark everywhere instead of four ways of saying it.
 */
export function MachineOnly() {
  return (
    <Badge title="Zapisane na tym komputerze (nie w folderze danych) – na drugim komputerze ustawiasz to osobno." data-testid="machine-only">
      tylko ten komputer
    </Badge>
  )
}
