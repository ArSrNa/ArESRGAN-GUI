import {
  BugPlayIcon,
  CircleQuestionMarkIcon,
  CloudUploadIcon,
  CopyrightIcon,
  HomeIcon,
  LinkIcon,
} from "lucide-react";
import logoSrc from "@/logo.png";

const { ipcRenderer } = window;
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
      url: "/faq",
      icon: <CircleQuestionMarkIcon className="size-4" />,
    },
    {
      title: "开源许可",
      url: "/os",
      icon: <CopyrightIcon className="size-4" />,
    },
    {
      title: "问题反馈",
      url: "https://support.qq.com/products/419220",
      icon: <LinkIcon className="size-4" />,
    },
    {
      title: "更多",
      url: "#",
      items: [
        {
          title: "调试控制台",
          description: "查看调试控制台工具",
          icon: <BugPlayIcon className="size-5 shrink-0" />,
          onClick: () => ipcRenderer.send("openDevTools"),
        },
        {
          title: "检查更新",
          description: "检查是否有更新",
          icon: <CloudUploadIcon className="size-5 shrink-0" />,
          onClick: () => CheckUpdate(),
        },
      ],
    },
  ],
}: Navbar1Props) => {
  return (
    <section className="py-3 fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-sm backdrop-saturate-200">
      <div className="container">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img
                src={logo.src}
                className="max-h-9 dark:invert"
                alt={logo.alt}
              />
              <span className="text-lg font-semibold tracking-tighter">
                {logo.title}
              </span>
            </div>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="w-full flex gap-5 items-center">
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
        </nav>
      </div>
    </section>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map((subItem) => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
              <div
                className="hover:bg-muted hover:text-accent-foreground flex min-w-80 select-none flex-row gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors"
                onClick={() => subItem.onClick && subItem.onClick()}
              >
                <div className="text-foreground">{subItem.icon}</div>
                <div>
                  <div className="text-sm font-semibold">{subItem.title}</div>
                  {subItem.description && (
                    <p className="text-muted-foreground text-sm leading-snug">
                      {subItem.description}
                    </p>
                  )}
                </div>
              </div>
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem
      key={item.title}
      className="items-center justify-center rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-[state=open]:focus:bg-accent outline-none transition-all duration-300 group"
    >
      <div className="flex gap-1 items-center">
        <a>{item?.icon}</a>
        {item.url.startsWith("/") && <Link to={item.url}>{item.title}</Link>}
        {item.url.startsWith("http") && (
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        )}
      </div>
    </NavigationMenuItem>
  );
};
