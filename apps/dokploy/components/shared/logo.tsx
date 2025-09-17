import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	logoUrl?: string;
}

export const Logo = ({ className = "size-14", logoUrl }: Props) => {
	if (logoUrl) {
		return (
			<img
				src={logoUrl}
				alt="Organization Logo"
				className={cn(className, "object-contain rounded-sm")}
			/>
		);
	}

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 64 64"
			role="img"
			aria-label="Dokploy logo"
			className={cn("text-primary", className)}
		>
			<title>Dokploy logo</title>
			<path
				d="M32 4 8 12v13c0 16.5 9.9 32 24 39 14.1-7 24-22.5 24-39V12Z"
				fill="none"
				stroke="currentColor"
				strokeWidth={4}
				strokeLinejoin="round"
			/>
			<rect
				x={18}
				y={20}
				width={28}
				height={12}
				rx={4}
				fill="none"
				stroke="currentColor"
				strokeWidth={4}
			/>
			<rect
				x={18}
				y={34}
				width={28}
				height={12}
				rx={4}
				fill="none"
				stroke="currentColor"
				strokeWidth={4}
			/>
			<circle cx={39} cy={26} r={3} fill="currentColor" />
			<circle cx={39} cy={40} r={3} fill="currentColor" />
		</svg>
	);
};
