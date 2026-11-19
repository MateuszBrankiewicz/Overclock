import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import React, { useMemo } from 'react';

type AnchoredHtmlProps = Omit<React.ComponentProps<typeof Html>, 'portal' | 'ref'>;

/**
 * drei `<Html>` pinned to the canvas wrapper element, which exists before the first frame and never changes.
 *
 * Without a fixed portal, `<Html>` mounted before R3F connects its event target first attaches to the
 * canvas parent and then re-attaches to the event target. The re-attach creates a second React root on
 * the same element, and React later throws "Failed to execute 'removeChild' on 'Node'" when the first
 * root finishes unmounting (seen at match start on every client).
 */
export const AnchoredHtml: React.FC<AnchoredHtmlProps> = (props) => {
  const gl = useThree((state) => state.gl);
  const portal = useMemo<React.RefObject<HTMLElement> | undefined>(() => {
    const wrapper = gl.domElement.parentElement;
    // A detached canvas has no wrapper yet; drei then uses its default target.
    return wrapper ? { current: wrapper } : undefined;
  }, [gl]);

  return <Html {...props} portal={portal} />;
};
