import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, MapPin, Moon } from "lucide-react";

interface SettingsViewProps {
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  locationEnabled: boolean;
  onLocationChange: (enabled: boolean) => void;
}

export function SettingsView({
  notificationsEnabled,
  onNotificationsChange,
  locationEnabled,
  onLocationChange,
}: SettingsViewProps) {
  return (
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      <h1 className="text-2xl font-medium mb-6">설정</h1>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림
          </CardTitle>
          <CardDescription>
            근처 메모가 있을 때 알림을 받습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="cursor-pointer">
              알림 활성화
            </Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={onNotificationsChange}
              data-testid="switch-notifications"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            위치
          </CardTitle>
          <CardDescription>
            현재 위치를 추적하여 근처 메모를 알려줍니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="cursor-pointer">
              위치 추적
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
          <CardTitle>앱 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">버전</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">개발자</span>
            <span>Location Memo Team</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
