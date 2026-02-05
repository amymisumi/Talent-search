import { useEffect, useState } from 'react';
import { addPortfolio, updatePortfolio, deletePortfolioWithStorage, onPortfoliosByProfile } from '@/integrations/firebase/services';
import { Portfolio } from '@/integrations/firebase/types';
import PortfolioUpload from '@/components/dashboard/PortfolioUpload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2 } from 'lucide-react';

const PortfolioSection = ({ userId }: { userId: string }) => {
	const [items, setItems] = useState<Portfolio[]>([]);
	const [editingItem, setEditingItem] = useState<null | { id: string; title: string; description?: string }>(null);

	useEffect(() => {
		if (!userId) {
			setItems([]);
			return;
		}
		const unsub = onPortfoliosByProfile(userId, setItems);
		return () => unsub && unsub();
	}, [userId]);

	const handleDelete = async (id: string, storagePath?: string) => {
		if (!window.confirm('Are you sure you want to delete this item?')) return;
		try {
			await deletePortfolioWithStorage(id, storagePath);
			setItems(prev => prev.filter(item => item.id !== id));
		} catch (error) {
			console.error('Error deleting portfolio item:', error);
		}
	};

	const handleOpenEdit = (item: Portfolio) => {
		setEditingItem({ id: item.id, title: item.title, description: item.description });
	};

	const handleSaveEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingItem) return;
		try {
			await updatePortfolio(editingItem.id, { title: editingItem.title, description: editingItem.description });
			setEditingItem(null);
		} catch (error) {
			console.error('Error updating portfolio item:', error);
		}
	};

	const formatFileSize = (bytes?: number) => {
		if (!bytes || bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">My Portfolio</h2>
					<p className="mt-1 text-sm text-gray-600">Showcase your best work to potential employers and collaborators</p>
				</div>
				<PortfolioUpload profileId={userId} />
			</div>

			{editingItem && (
				<Card className="p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-medium">Edit Portfolio Item</h3>
						<button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-500">
							<X className="w-5 h-5" />
						</button>
					</div>
					<form onSubmit={handleSaveEdit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
							<Input type="text" value={editingItem.title} onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, title: e.target.value }) : prev)} required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
							<Textarea value={editingItem.description} onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, description: e.target.value }) : prev)} rows={3} />
						</div>
						<div className="flex justify-end space-x-3 pt-2">
							<Button variant="outline" type="button" onClick={() => setEditingItem(null)}>Cancel</Button>
							<Button type="submit">Save</Button>
						</div>
					</form>
				</Card>
			)}

			{items.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<Card key={item.id} className="overflow-hidden">
							<div className="relative h-48 bg-gray-100">
								{item.fileType === 'image' ? (
									<img src={item.fileUrl} alt={item.title} className="object-cover w-full h-full" />
								) : item.fileType === 'video' ? (
									<div className="flex items-center justify-center h-full bg-gray-800">
										<Video className="w-12 h-12 text-white" />
									</div>
								) : (
									<div className="flex flex-col items-center justify-center h-full p-6 text-center">
										<FileText className="w-12 h-12 text-gray-400" />
										<p className="mt-2 text-sm font-medium text-gray-700">{item.fileName}</p>
										<p className="text-xs text-gray-500">{formatFileSize(item.fileSize)}</p>
									</div>
								)}

								<button onClick={() => handleDelete(item.id, (item as any).storagePath)} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50" title="Delete item">
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="p-4">
								<h3 className="text-lg font-medium text-gray-900 truncate">{item.title}</h3>
								{item.description && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>}

								<div className="flex items-center justify-between mt-3">
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{(item.fileType || '').toUpperCase()}</span>
									<div className="flex space-x-2">
										<Button variant="outline" size="sm" asChild>
											<a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm">View</a>
										</Button>
										<Button variant="outline" size="sm" asChild>
											<a href={item.fileUrl} download className="text-sm">Download</a>
										</Button>
										<Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>Edit</Button>
									</div>
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
					<div className="flex justify-center">
						<div className="p-3 bg-blue-100 rounded-full">
							<Upload className="w-6 h-6 text-blue-600" />
						</div>
					</div>
					<h3 className="mt-2 text-sm font-medium text-gray-900">No portfolio items yet</h3>
					<p className="mt-1 text-sm text-gray-500">Get started by uploading your first portfolio item.</p>
				</div>
			)}
		</div>
	);
};

export default PortfolioSection;
