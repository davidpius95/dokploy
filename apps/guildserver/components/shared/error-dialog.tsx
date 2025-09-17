import { AlertTriangle, RotateCcw } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ErrorDialogProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	title?: string;
	description?: React.ReactNode;
	details?: React.ReactNode;
	retryLabel?: string;
	dismissLabel?: string;
	onRetry?: () => void;
	onDismiss?: () => void;
}

export const ErrorDialog = ({
	open,
	onOpenChange,
	title = "Something went wrong",
	description = "An unexpected error occurred while processing your request.",
	details,
	retryLabel = "Try again",
	dismissLabel = "Dismiss",
	onRetry,
	onDismiss,
}: ErrorDialogProps) => {
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			onDismiss?.();
		}
		onOpenChange?.(nextOpen);
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent className="modal-panel">
				<AlertDialogHeader className="space-y-4">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
						<AlertTriangle className="size-7 animate-[gentlePulse_2.4s_ease-in-out_infinite]" />
					</div>
					<AlertDialogTitle className="text-center text-xl text-foreground">
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription className="text-center text-base text-muted-foreground">
						{description}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{details ? (
					<div className="surface-glass glow-border max-h-48 overflow-auto px-4 py-3 text-sm text-foreground/90">
						{typeof details === "string" ? (
							<p className="whitespace-pre-line">{details}</p>
						) : (
							details
						)}
					</div>
				) : null}
				<AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
					<AlertDialogCancel className="w-full sm:w-auto" onClick={onDismiss}>
						{dismissLabel}
					</AlertDialogCancel>
					{onRetry ? (
						<AlertDialogAction
							variant="sky"
							className={cn("btn-sky w-full sm:w-auto gap-2")}
							onClick={onRetry}
						>
							<RotateCcw className="size-4" />
							{retryLabel}
						</AlertDialogAction>
					) : null}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
