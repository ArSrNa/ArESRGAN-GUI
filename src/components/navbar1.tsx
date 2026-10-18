import {
  BugPlayIcon,
  CircleQuestionMarkIcon,
  CloudUploadIcon,
  CopyrightIcon,
  HomeIcon,
  LinkIcon,
} from "lucide-react";
import logoSrc from "@/logo.png";

import { openDevtools } from "@/lib/desktop";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Link } from "react-router-dom";
import { CheckUpdate } from "@/utils";

interface MenuItem {
  title: string;
  url?: string;
  onClick?: () => void;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

interface Navbar1Props {
  logo?: {
    src: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
}

export const Navbar1 = ({
  logo = {
    src: logoSrc,
    alt: "logo",
    title: "ArSrNa 图像超分",
  },
  menu = [
    { title: "首页", url: "/", icon: <HomeIcon className="size-4" /> },
    {
      title: "常见问题",
      url: "https://arsrna-it.feishu.cn/docx/ZV3Udb8ZBotFytxfqs8ciG2YnQb?from=from_copylink",
