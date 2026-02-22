'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import RatingBadge from './RatingBadge';

interface DayTabsProps {
  reportId: string;
}

const mockDays = [
  { day: 'Monday', rating: 8, analysis: 'Favorable for new beginnings and important meetings.' },
  { day: 'Tuesday', rating: 6, analysis: 'Moderate energy. Good for routine tasks.' },
  { day: 'Wednesday', rating: 9, analysis: 'Excellent communication and learning opportunities.' },
  { day: 'Thursday', rating: 7, analysis: 'Good for financial planning and investments.' },
  { day: 'Friday', rating: 5, analysis: 'Mixed energies. Avoid major decisions.' },
  { day: 'Saturday', rating: 4, analysis: 'Focus on rest and spiritual practices.' },
  { day: 'Sunday', rating: 8, analysis: 'Great for family time and creative pursuits.' },
];

export default function DayTabs({ reportId }: DayTabsProps) {
  console.log('Report ID:', reportId);
  
  return (
    <Tabs defaultValue="Monday" className="w-full">
      <TabsList className="grid w-full grid-cols-7">
        {mockDays.map((day) => (
          <TabsTrigger key={day.day} value={day.day}>
            {day.day.slice(0, 3)}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {mockDays.map((day) => (
        <TabsContent key={day.day} value={day.day}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{day.day}</h3>
                <RatingBadge rating={day.rating} />
              </div>
              <p className="text-muted-foreground">{day.analysis}</p>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
