import { BadgePercent, BarChart3, Bell, Bot, Building2, CheckCircle2, Clock, Cloud, Code2, CreditCard, Database, FileText, Globe, Headphones, Layers, LineChart, Lock, Mail, MessageSquare, Palette, PieChart, Puzzle, Repeat, Rocket, Server, Settings, ShieldCheck, Sparkles, Target, TrendingUp, Users, Wallet, Webhook, Workflow, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PLAN_ICON_NAMES = ["ShieldCheck", "BadgePercent", "Palette", "Zap", "FileText", "Repeat", "Users", "Building2", "BarChart3", "Lock", "Server", "Cloud", "Bot", "Sparkles", "Rocket", "Globe", "Mail", "MessageSquare", "Bell", "Clock", "CreditCard", "Wallet", "LineChart", "PieChart", "Layers", "Puzzle", "Settings", "Headphones", "CheckCircle2", "Database", "Workflow", "Webhook", "Code2", "Target", "TrendingUp"] as const;

export type PlanIconName = (typeof PLAN_ICON_NAMES)[number];
export const PLAN_ICONS: Record<PlanIconName, LucideIcon> = { ShieldCheck, BadgePercent, Palette, Zap, FileText, Repeat, Users, Building2, BarChart3, Lock, Server, Cloud, Bot, Sparkles, Rocket, Globe, Mail, MessageSquare, Bell, Clock, CreditCard, Wallet, LineChart, PieChart, Layers, Puzzle, Settings, Headphones, CheckCircle2, Database, Workflow, Webhook, Code2, Target, TrendingUp };
export function getPlanIcon(name?: string): LucideIcon { return name && name in PLAN_ICONS ? PLAN_ICONS[name as PlanIconName] : Sparkles; }
