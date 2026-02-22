'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const birthDataSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  birth_city: z.string().min(2, 'Birth city is required'),
  latitude: z.string().min(1, 'Latitude is required'),
  longitude: z.string().min(1, 'Longitude is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  current_city: z.string().optional(),
});

type BirthDataForm = z.infer<typeof birthDataSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BirthDataForm>({
    resolver: zodResolver(birthDataSchema),
  });

  const onSubmit = async (data: BirthDataForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          birth_date: data.date,
          birth_time: data.time,
          birth_city: data.birth_city,
          birth_lat: parseFloat(data.latitude),
          birth_lng: parseFloat(data.longitude),
          timezone: data.timezone,
          current_city: data.current_city,
          report_type: 'Full Vedic Analysis',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const { reportId } = await response.json();
      router.push(`/report/${reportId}`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Enter Birth Details</CardTitle>
          <CardDescription>
            Provide accurate birth information for precise Vedic astrology analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date of Birth</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time of Birth</Label>
                <Input
                  id="time"
                  type="time"
                  {...register('time')}
                />
                {errors.time && (
                  <p className="text-sm text-red-500">{errors.time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_city">Birth City</Label>
              <Input
                id="birth_city"
                placeholder="New Delhi, India"
                {...register('birth_city')}
              />
              {errors.birth_city && (
                <p className="text-sm text-red-500">{errors.birth_city.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="28.6139"
                  {...register('latitude')}
                />
                {errors.latitude && (
                  <p className="text-sm text-red-500">{errors.latitude.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="77.2090"
                  {...register('longitude')}
                />
                {errors.longitude && (
                  <p className="text-sm text-red-500">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="Asia/Kolkata"
                {...register('timezone')}
              />
              {errors.timezone && (
                <p className="text-sm text-red-500">{errors.timezone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_city">Current City (Optional)</Label>
              <Input
                id="current_city"
                placeholder="Mumbai, India"
                {...register('current_city')}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
