import { useState, useCallback, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Info, 
  Moon, 
  Sun, 
  Monitor,
  Database,
  Shield,
  Zap
} from 'lucide-react';
import { MobileHeader } from '@/components/navigation';
import { useIsMobile } from '@/hooks';
import { useToast } from '@/hooks/useToast';
import { useSettings, updateSettings, db, getStorageEstimate, loadSampleData } from '@/db';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import type { Settings } from '@/types';
import { createBackup, parseBackup, restoreBackup, type Backup } from '@/lib/backup';

export function SettingsPage() {
  const isMobile = useIsMobile();
  const settings = useSettings();
  const { addToast } = useToast();
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState<{ pending: boolean; data?: Backup }>({ pending: false });

  // Load storage info
  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  const handleLoadSampleData = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      await loadSampleData();
      addToast({
        type: 'success',
        title: 'Success',
        description: 'Sample data loaded successfully! Reloading...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to load sample data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load sample data. Please try again.',
      });
    } finally {
      setIsLoadingSample(false);
    }
  }, [addToast]);

  const handleThemeChange = useCallback(async (theme: Settings['theme']) => {
    await updateSettings({ theme });
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = await createBackup();

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-kin-map-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await updateSettings({ lastBackupDate: new Date() });
      
      addToast({
        type: 'success',
        title: 'Success',
        description: 'Backup exported successfully',
      });
    } catch (error) {
      console.error('Export failed:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Export failed. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [addToast]);

  const handleImportJSON = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = parseBackup(text);
        setShowImportConfirm({ pending: true, data });
      } catch (error) {
        console.error('Import failed:', error);
        addToast({
          type: 'error',
          title: 'Error',
          description: 'Import failed. Please check the file format and try again.',
        });
        setIsImporting(false);
      }
    };

    input.click();
  }, [addToast]);

  const handleConfirmImport = useCallback(async () => {
    if (!showImportConfirm.data) return;

    try {
      await restoreBackup(showImportConfirm.data);

      addToast({
        type: 'success',
        title: 'Success',
        description: 'Import successful! Reloading...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Import failed:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Import failed. Please try again.',
      });
    } finally {
      setIsImporting(false);
      setShowImportConfirm({ pending: false });
    }
  }, [showImportConfirm.data, addToast]);

  const handleCancelImport = useCallback(() => {
    setShowImportConfirm({ pending: false });
    setIsImporting(false);
  }, []);

  const handleClearData = useCallback(async () => {
    setShowClearDataConfirm(true);
  }, []);

  const handleConfirmClearData = useCallback(async () => {
    try {
      await db.persons.clear();
      await db.families.clear();
      await db.trees.clear();

      addToast({
        type: 'success',
        title: 'Success',
        description: 'All data has been deleted. Reloading...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Clear failed:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete data. Please try again.',
      });
    } finally {
      setShowClearDataConfirm(false);
    }
  }, [addToast]);

  const handleCancelClearData = useCallback(() => {
    setShowClearDataConfirm(false);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full">
      {isMobile && <MobileHeader title="Settings" />}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">
        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>My Kin Map</strong> is a local-first family tree application.
            </p>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Your data stays on your device. We don't collect or store any personal information on servers.
              </p>
            </div>
            <p className="pt-2 border-t">
              Version 1.0.0
            </p>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Theme</span>
              <Select
                value={settings?.theme ?? 'system'}
                onValueChange={(value) => handleThemeChange(value as Settings['theme'])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" /> Light
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" /> Dark
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> System
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Management
            </CardTitle>
            <CardDescription>
              Your family data is stored in this browser on this device. Export a backup regularly so you can recover it if you lose the device or clear browser data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Storage info */}
            {storageInfo && (
              <div className="text-sm text-muted-foreground">
                Using {formatBytes(storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last backup */}
            {settings?.lastBackupDate && (
              <p className="text-sm text-muted-foreground">
                Last backup: {new Date(settings.lastBackupDate).toLocaleDateString()}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-medium">Full Backup</p>
              <Button
                variant="outline"
                onClick={handleExportJSON}
                disabled={isExporting}
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
              </Button>
              <Button
                variant="outline"
                onClick={handleImportJSON}
                disabled={isImporting}
                className="justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import from Backup'}
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-xs text-muted-foreground font-medium">Test the App</p>
              <Button
                variant="outline"
                onClick={handleLoadSampleData}
                disabled={isLoadingSample}
                className="justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isLoadingSample ? 'Loading...' : 'Load Sample Data'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Load a sample family tree with 3 generations to explore the app features.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearDataConfirm} onOpenChange={setShowClearDataConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Data?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete ALL data? This cannot be undone. Please export a backup first!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelClearData}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmClearData}>
              Delete All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={showImportConfirm.pending} onOpenChange={(open) => !open && handleCancelImport()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Backup?</DialogTitle>
            <DialogDescription>
              This will import {showImportConfirm.data?.persons.length} people and {showImportConfirm.data?.families.length} families. Existing data with the same IDs will be overwritten. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelImport}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
