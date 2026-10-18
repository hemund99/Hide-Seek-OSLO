def decode(s):
    i=0;lat=0;lng=0;out=[]
    while i<len(s):
        delta=[]
        for _ in range(2):
            value=0;shift=0
            while True:
                b=ord(s[i])-63;i+=1;value|=(b&31)<<shift;shift+=5
                if b<32:break
            delta.append(~(value>>1) if value&1 else value>>1)
        lat+=delta[0];lng+=delta[1];out.append((lat,lng))
    return out
def encode(points):
    previous=(0,0);out=[]
    for point in points:
        for v,p in zip(point,previous):
            delta=v-p;n=~(delta<<1) if delta<0 else delta<<1
            while n>=32:out.append(chr((32|(n&31))+63));n>>=5
            out.append(chr(n+63))
        previous=point
    return ''.join(out)
