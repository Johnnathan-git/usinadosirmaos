import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, FileText, Power, PowerOff, Settings, TrendingUp, Pencil, Trash2, Eye, ShieldAlert, Paperclip, Loader2 } from "lucide-react";
import { CLIENT_COLORS, brl, initial, monthLabelFromISO, getClientButtonStyles } from "@/lib/format";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// FILE TOO LARGE FOR INLINE - see follow-up
export const Route = createFileRoute("/_app/faturas")({ ssr: false, component: () => null });
