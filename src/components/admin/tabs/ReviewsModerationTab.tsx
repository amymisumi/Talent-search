import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Eye, EyeOff, Trash2, Star } from 'lucide-react';
import { getAllReviewsForAdmin, moderateReview, Review } from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const ReviewsModerationTab: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const allReviews = await getAllReviewsForAdmin();
      setReviews(allReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reviews"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reviewId: string, action: 'hide' | 'unhide' | 'delete') => {
    if (!currentUser) return;
    try {
      await moderateReview(currentUser.uid, reviewId, action);
      toast({
        title: "Success",
        description: `Review ${action} successfully`
      });
      loadReviews();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to moderate review"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-400" />
            Reviews & Ratings Moderation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="text-slate-300">Recruiter</TableHead>
                      <TableHead className="text-slate-300">Rating</TableHead>
                      <TableHead className="text-slate-300">Review</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white">{review.recruiterName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-white">{review.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-slate-300">
                      {review.reviewText || 'No text review'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(review as any).isHidden ? 'secondary' : 'default'}>
                        {(review as any).isHidden ? 'Hidden' : 'Visible'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(review as any).isHidden ? (
                          <Button
                            size="sm"
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                            onClick={() => handleModerate(review.id, 'unhide')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30"
                            onClick={() => handleModerate(review.id, 'hide')}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this review?')) {
                              handleModerate(review.id, 'delete');
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

