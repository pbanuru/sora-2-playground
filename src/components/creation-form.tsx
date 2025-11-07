'use client';

import type { VideoModel, VideoSeconds, VideoSize } from 'openai/resources/videos';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Upload, X } from 'lucide-react';
import * as React from 'react';

export type CreationFormData = {
    model: VideoModel;
    prompt: string;
    size: VideoSize;
    seconds: VideoSeconds;
    input_reference?: File;
};

type CreationFormProps = {
    onSubmit: (data: CreationFormData) => void;
    isLoading: boolean;
    currentMode: 'create' | 'remix';
    onModeChange: (mode: 'create' | 'remix') => void;
    model: VideoModel;
    setModel: React.Dispatch<React.SetStateAction<VideoModel>>;
    prompt: string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    size: VideoSize;
    setSize: React.Dispatch<React.SetStateAction<VideoSize>>;
    seconds: VideoSeconds;
    setSeconds: React.Dispatch<React.SetStateAction<VideoSeconds>>;
    inputReference: File | null;
    setInputReference: React.Dispatch<React.SetStateAction<File | null>>;
};

export function CreationForm({
    onSubmit,
    isLoading,
    currentMode,
    onModeChange,
    model,
    setModel,
    prompt,
    setPrompt,
    size,
    setSize,
    seconds,
    setSeconds,
    inputReference,
    setInputReference
}: CreationFormProps) {
    // Calculate estimated cost
    const calculateEstimatedCost = (): number => {
        const duration = parseInt(seconds as string);
        let pricePerSecond = 0;

        if (model === 'sora-2') {
            pricePerSecond = 0.10;
        } else if (model === 'sora-2-pro') {
            // Check if it's 1080p resolution
            if (size === '1024x1792' || size === '1792x1024') {
                pricePerSecond = 0.50;
            } else {
                pricePerSecond = 0.30;
            }
        }

        return duration * pricePerSecond;
    };

    const estimatedCost = calculateEstimatedCost();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData: CreationFormData = {
            model,
            prompt,
            size,
            seconds
        };
        if (inputReference) {
            formData.input_reference = inputReference;
        }
        onSubmit(formData);
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const detectAndSetDimensions = (file: File): Promise<void> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    const detectedSize = `${img.width}x${img.height}` as VideoSize;
                    setSize(detectedSize);
                    URL.revokeObjectURL(img.src);
                    resolve();
                };
                img.onerror = () => {
                    resolve(); // Continue even if detection fails
                };
                img.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    const detectedSize = `${video.videoWidth}x${video.videoHeight}` as VideoSize;
                    setSize(detectedSize);
                    URL.revokeObjectURL(video.src);
                    resolve();
                };
                video.onerror = () => {
                    resolve(); // Continue even if detection fails
                };
                video.src = URL.createObjectURL(file);
            } else {
                resolve();
            }
        });
    };

    const validateAndSetFile = async (file: File) => {
        const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
        if (file.size > maxSizeBytes) {
            alert(`File size exceeds 100 MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
            return false;
        }
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        if (!validTypes.includes(file.type)) {
            alert(`Invalid file type. Please use JPEG, PNG, WebP, or MP4 files.`);
            return false;
        }

        // Detect dimensions and auto-set size
        await detectAndSetDimensions(file);

        setInputReference(file);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return true;
    };

    // Cleanup preview URL when component unmounts or file changes
    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleInputReferenceChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isValid = await validateAndSetFile(file);
            if (!isValid && fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear the input
            }
        }
    };

    const handlePaste = async (event: React.ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await validateAndSetFile(file);
                }
                break;
            }
        }
    };

    const handleRemoveFile = () => {
        setInputReference(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <CardHeader className='flex items-start justify-between border-b border-white/10 pb-4'>
                <div>
                    <div className='flex items-center'>
                        <CardTitle className='py-1 text-lg font-medium text-white'>Create Video</CardTitle>
                    </div>
                    <CardDescription className='mt-1 text-white/60'>
                        Generate a new video from a text prompt using Sora 2.
                    </CardDescription>
                </div>
                <ModeToggle currentMode={currentMode} onModeChange={onModeChange} />
            </CardHeader>
            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-5 overflow-y-auto p-4 lg:overflow-visible'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='prompt' className='text-white'>
                            Prompt
                        </Label>
                        <Textarea
                            id='prompt'
                            placeholder='e.g., Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward.'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            required
                            disabled={isLoading}
                            className='min-h-[100px] resize-none rounded-md border border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                        />
                        <p className='text-xs text-white/40'>
                            Describe: shot type, subject, action, setting, and lighting for best results.
                        </p>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='model-select' className='text-white'>
                            Model
                        </Label>
                        <Select
                            value={model}
                            onValueChange={(value) => setModel(value as VideoModel)}
                            disabled={isLoading}>
                            <SelectTrigger
                                id='model-select'
                                className='rounded-md border border-white/20 bg-black text-white focus:border-white/50 focus:ring-white/50'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className='border-white/20 bg-black text-white'>
                                <SelectItem value='sora-2' className='focus:bg-white/10 focus:text-white'>
                                    Sora 2
                                </SelectItem>
                                <SelectItem value='sora-2-pro' className='focus:bg-white/10 focus:text-white'>
                                    Sora 2 Pro
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='size-input' className='text-white'>
                            Size (Resolution)
                        </Label>
                        <Input
                            id='size-input'
                            type='text'
                            placeholder='e.g., 1280x720 or 736x736'
                            value={size}
                            onChange={(e) => setSize(e.target.value as VideoSize)}
                            disabled={isLoading}
                            className='rounded-md border border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                        />
                        <div className='flex flex-wrap gap-2 text-xs'>
                            <span className='text-white/40'>Common:</span>
                            <button
                                type='button'
                                onClick={() => setSize('1280x720')}
                                disabled={isLoading}
                                className='cursor-pointer text-white/60 underline decoration-dotted hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                1280x720
                            </button>
                            <span className='text-white/40'>•</span>
                            <button
                                type='button'
                                onClick={() => setSize('720x1280')}
                                disabled={isLoading}
                                className='cursor-pointer text-white/60 underline decoration-dotted hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                720x1280
                            </button>
                            <span className='text-white/40'>•</span>
                            <button
                                type='button'
                                onClick={() => setSize('1024x1024')}
                                disabled={isLoading}
                                className='cursor-pointer text-white/60 underline decoration-dotted hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                1024x1024
                            </button>
                            <span className='text-white/40'>•</span>
                            <button
                                type='button'
                                onClick={() => setSize('1792x1024')}
                                disabled={isLoading}
                                className='cursor-pointer text-white/60 underline decoration-dotted hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                1792x1024
                            </button>
                        </div>
                    </div>

                    <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-white'>Duration</Label>
                            <span className='text-sm font-medium text-white'>{seconds} seconds</span>
                        </div>
                        <div className='flex gap-4'>
                            <button
                                type='button'
                                onClick={() => setSeconds('4')}
                                disabled={isLoading}
                                className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                    seconds === '4'
                                        ? 'border-white bg-white text-black'
                                        : 'border-white/20 bg-black text-white hover:border-white/50'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                4 seconds
                            </button>
                            <button
                                type='button'
                                onClick={() => setSeconds('8')}
                                disabled={isLoading}
                                className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                    seconds === '8'
                                        ? 'border-white bg-white text-black'
                                        : 'border-white/20 bg-black text-white hover:border-white/50'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                8 seconds
                            </button>
                            <button
                                type='button'
                                onClick={() => setSeconds('12')}
                                disabled={isLoading}
                                className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                    seconds === '12'
                                        ? 'border-white bg-white text-black'
                                        : 'border-white/20 bg-black text-white hover:border-white/50'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                12 seconds
                            </button>
                        </div>
                        <p className='text-xs text-white/40'>
                            Select video duration. Supported values: 4, 8, or 12 seconds
                        </p>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='input-reference' className='text-white'>
                            Input Reference (Optional)
                        </Label>

                        {!inputReference ? (
                            <div
                                onPaste={handlePaste}
                                className='relative rounded-md border border-dashed border-white/20 bg-black/50 p-6 transition-colors hover:border-white/40 focus-within:border-white/50'
                            >
                                <Input
                                    ref={fileInputRef}
                                    id='input-reference'
                                    type='file'
                                    accept='image/jpeg,image/png,image/webp,video/mp4'
                                    onChange={handleInputReferenceChange}
                                    disabled={isLoading}
                                    className='absolute inset-0 cursor-pointer opacity-0'
                                />
                                <div className='flex flex-col items-center justify-center text-center'>
                                    <Upload className='mb-2 h-8 w-8 text-white/40' />
                                    <p className='text-sm text-white/60'>
                                        Click to upload or <span className='font-medium text-white'>paste</span> an image/video
                                    </p>
                                    <p className='mt-1 text-xs text-white/40'>
                                        JPEG, PNG, WebP, or MP4 (max 100 MB)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {previewUrl && (
                                    <div className='relative overflow-hidden rounded-md border border-white/20 bg-black'>
                                        {inputReference.type.startsWith('image/') ? (
                                            <img
                                                src={previewUrl}
                                                alt='Input reference preview'
                                                className='h-auto w-full object-contain max-h-[300px]'
                                            />
                                        ) : (
                                            <video
                                                src={previewUrl}
                                                controls
                                                className='h-auto w-full object-contain max-h-[300px]'
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        )}
                                    </div>
                                )}
                                <div className='flex items-center gap-3 rounded-md border border-white/20 bg-black/50 p-3'>
                                    <div className='flex-1 truncate text-sm text-white/80'>
                                        {inputReference.name}
                                    </div>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleRemoveFile}
                                        disabled={isLoading}
                                        className='h-8 w-8 p-0 text-white/60 hover:bg-white/10 hover:text-white'
                                    >
                                        <X className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <p className='text-xs text-white/40'>
                            Upload an image or video to use as the first frame reference.
                        </p>
                        <p className='text-xs text-white/40'>
                            Maximum file size is 100 MB. Video input is not available for all organizations.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className='flex flex-col gap-3 border-t border-white/10 p-4'>
                    <div className='flex w-full items-center justify-between rounded-md bg-white/5 px-4 py-2.5 border border-white/10'>
                        <span className='text-sm text-white/60'>Estimated Cost</span>
                        <span className='text-lg font-semibold text-white'>
                            ${estimatedCost.toFixed(2)}
                        </span>
                    </div>
                    <Button
                        type='submit'
                        disabled={isLoading || !prompt.trim()}
                        className='w-full bg-white text-black hover:bg-white/90 disabled:bg-white/40'>
                        {isLoading ? (
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                Creating Video...
                            </>
                        ) : (
                            <>
                                <Sparkles className='mr-2 h-4 w-4' />
                                Create Video
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
