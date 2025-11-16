import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, Languages, LogOut } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";

interface SettingsViewProps {
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  locationEnabled: boolean;
  onLocationChange: (enabled: boolean) => void;
  proximityRadius: number;
  onProximityRadiusChange: (radius: number) => void;
}

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

export function SettingsView({
  notificationsEnabled,
  onNotificationsChange,
  locationEnabled,
  onLocationChange,
  proximityRadius,
  onProximityRadiusChange,
}: SettingsViewProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      <h1 className="text-2xl font-medium mb-6">{t.settings.title}</h1>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t.settings.language}
          </CardTitle>
          <CardDescription>
            {t.settings.languageDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="w-full" data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} data-testid={`language-${option.value}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.flag}</span>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.settings.notifications}
          </CardTitle>
          <CardDescription>
            {t.settings.notificationsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="cursor-pointer">
              {t.settings.notificationsEnable}
            </Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={onNotificationsChange}
              data-testid="switch-notifications"
            />
          </div>
          
          {notificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="proximity-radius">{t.settings.proximityRadius}</Label>
              <Select 
                value={proximityRadius.toString()} 
                onValueChange={(value) => onProximityRadiusChange(Number(value))}
              >
                <SelectTrigger id="proximity-radius" data-testid="select-proximity-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50" data-testid="radius-50m">{t.settings.radius50m}</SelectItem>
                  <SelectItem value="100" data-testid="radius-100m">{t.settings.radius100m}</SelectItem>
                  <SelectItem value="200" data-testid="radius-200m">{t.settings.radius200m}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t.settings.proximityRadiusDesc}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.settings.location}
          </CardTitle>
          <CardDescription>
            {t.settings.locationDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="cursor-pointer">
              {t.settings.locationTracking}
            </Label>
            <Switch
              id="location"
              checked={locationEnabled}
              onCheckedChange={onLocationChange}
              data-testid="switch-location"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t.settings.account}
          </CardTitle>
          <CardDescription>
            {t.settings.logoutDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            {t.settings.logout}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t.settings.appInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.settings.version}</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.settings.developer}</span>
            <span>{t.settings.developerName}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
