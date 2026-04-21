import {fontSize, spacing} from '@/theme/tokens.stylex';
import stylex from '@stylexjs/stylex';
import {PropsWithChildren, ReactNode} from 'react';
import {Link} from 'react-router-dom';

const styles = stylex.create({
    container: {
        backgroundColor: '#1a1a1a',
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[8],
        maxWidth: '36rem',
        marginHorizontal: 'auto',
        paddingVertical: {
            default: '6rem',
            '@media screen and (max-width: 768px)': '3rem',
        },
        paddingHorizontal: spacing[8],
        color: '#fff',
        alignItems: 'center',
    },
    spinner: {
        width: 48,
        height: 48,
        border: '3px solid rgba(255,255,255,0.2)',
        borderTop: '3px solid #fff',
        borderRadius: '50%',
        animationName: stylex.keyframes({
            from: {transform: 'rotate(0deg)'},
            to: {transform: 'rotate(360deg)'},
        }),
        animationDuration: '0.8s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
    },
    title: {
        textAlign: 'center',
        lineHeight: '2rem',
        fontSize: fontSize['2xl'],
        fontWeight: 400,
    },
    description: {
        textAlign: 'center',
        color: '#A7B3BF',
    },
    link: {
        textAlign: 'center',
        textDecorationLine: 'underline',
        color: '#A7B3BF',
    },
});

type Props = PropsWithChildren<{
    title: string;
    description?: string | ReactNode;
    linkProps?: {
        to: string;
        label: string;
    };
}>;

export default function LoadingStateScreen({title, description, children, linkProps}: Props) {
    return (
        <div {...stylex.props(styles.container)}>
            <div {...stylex.props(styles.content)}>
                <div {...stylex.props(styles.spinner)} />
                <h2 {...stylex.props(styles.title)}>{title}</h2>
                {description != null && (
                    <div {...stylex.props(styles.description)}>{description}</div>
                )}
                {children}
                {linkProps != null && (
                    <Link to={linkProps.to} {...stylex.props(styles.link)}>
                        {linkProps.label}
                    </Link>
                )}
            </div>
        </div>
    );
}
