import { Badge } from '@/components/ui/badge';

interface RatingBadgeProps {
  rating: number;
}

export default function RatingBadge({ rating }: RatingBadgeProps) {
  const getColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-500 hover:bg-green-600';
    if (rating >= 6) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  return (
    <Badge className={`${getColor(rating)} text-white`}>
      {rating}/10
    </Badge>
  );
}
